// Server-side database route used by src/utils/db/client.ts.
// Supports the small query subset the admin app used with Supabase:
// select (columns, one-level join), eq/in filters, order, single,
// insert and update (optionally returning rows). Local dev MongoDB only.
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import type { Db, Document, Filter } from "mongodb";
import { getDb } from "@/server/mongo";

export const dynamic = "force-dynamic";

const TABLES = new Set(["courses", "subjects", "chapters", "topics", "questions", "paragraphs"]);

type FilterSpec = { op: "eq" | "in"; column: string; value: unknown };
type Body = {
  table: string;
  action: "select" | "insert" | "update";
  columns?: string;
  filters?: FilterSpec[];
  order?: { column: string; ascending: boolean }[];
  single?: boolean;
  values?: Document | Document[];
  returning?: boolean;
};
type DbError = { message: string; code?: string; details?: string };

class QueryError extends Error {
  constructor(public err: DbError) {
    super(err.message);
  }
}

// ---------- column parsing: "*, paragraphs(id, content)" ----------
type ColumnSpec = { all: boolean; fields: string[]; joins: { table: string; fields: string[] }[] };

function parseColumns(columns = "*"): ColumnSpec {
  const spec: ColumnSpec = { all: false, fields: [], joins: [] };
  let depth = 0;
  let cur = "";
  const parts: string[] = [];
  for (const ch of columns) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  for (const p of parts) {
    const m = p.match(/^(\w+)\s*\((.*)\)$/);
    if (m) {
      if (!TABLES.has(m[1])) throw new QueryError({ message: `Unknown join table ${m[1]}` });
      spec.joins.push({ table: m[1], fields: m[2].split(",").map((s) => s.trim()).filter(Boolean) });
    } else if (p === "*") spec.all = true;
    else spec.fields.push(p);
  }
  if (!spec.all && spec.fields.length === 0 && spec.joins.length === 0) spec.all = true;
  return spec;
}

function project(doc: Document, fields: string[], all: boolean): Document {
  const { _id, ...rest } = doc;
  if (all || fields.includes("*")) return rest;
  const out: Document = {};
  for (const f of fields) out[f] = rest[f] ?? null;
  return out;
}

async function applySelect(db: Db, docs: Document[], spec: ColumnSpec): Promise<Document[]> {
  const rows = docs.map((d) => project(d, spec.fields, spec.all));
  for (const j of spec.joins) {
    // many-to-one join via "<singular>_id" (e.g. paragraphs -> paragraph_id)
    const fk = `${j.table.replace(/s$/, "")}_id`;
    const ids = Array.from(new Set(docs.map((d) => d[fk]).filter(Boolean)));
    const related = ids.length ? await db.collection(j.table).find({ id: { $in: ids } }).toArray() : [];
    const byId = new Map(related.map((r) => [r.id, project(r, j.fields, false)]));
    rows.forEach((row, i) => {
      row[j.table] = byId.get(docs[i][fk]) ?? null;
    });
  }
  return rows;
}

// ---------- filters ----------
function buildFilter(filters: FilterSpec[] = []): Filter<Document> {
  const q: Document = {};
  for (const f of filters) {
    if (!/^\w+$/.test(f.column)) throw new QueryError({ message: `Bad column ${f.column}` });
    if (f.op === "eq") q[f.column] = f.value;
    else if (f.op === "in") q[f.column] = { $in: Array.isArray(f.value) ? f.value : [f.value] };
    else throw new QueryError({ message: `Unsupported filter ${(f as FilterSpec).op}` });
  }
  return q;
}

// ---------- defaults that Supabase/Postgres used to fill ----------
const QUESTION_DEFAULTS = {
  is_marked_for_review: false,
  review_in_app: false,
  verified_in_app: false,
  important: false,
  outside_ncert: false,
  type: null,
  paragraph_id: null,
};

async function topicParents(db: Db, topicIds: string[]) {
  const topics = await db.collection("topics").find({ id: { $in: topicIds } }).toArray();
  const chapters = await db
    .collection("chapters")
    .find({ id: { $in: topics.map((t) => t.chapter_id) } })
    .toArray();
  const subjects = await db
    .collection("subjects")
    .find({ id: { $in: chapters.map((c) => c.subject_id) } })
    .toArray();
  const ch = new Map(chapters.map((c) => [c.id, c]));
  const sb = new Map(subjects.map((s) => [s.id, s]));
  const out = new Map<string, { chapter_id: string | null; subject_id: string | null; course_id: string | null }>();
  for (const t of topics) {
    const c = ch.get(t.chapter_id);
    const s = c ? sb.get(c.subject_id) : undefined;
    out.set(t.id, { chapter_id: c?.id ?? null, subject_id: s?.id ?? null, course_id: s?.course_id ?? null });
  }
  return out;
}

async function withParents(db: Db, table: string, rows: Document[]) {
  if (table !== "questions" && table !== "paragraphs") return;
  const ids = Array.from(new Set(rows.map((r) => r.topic_id).filter(Boolean))) as string[];
  if (!ids.length) return;
  const parents = await topicParents(db, ids);
  for (const r of rows) {
    if (!r.topic_id) continue;
    const p = parents.get(r.topic_id);
    if (!p) throw new QueryError({ message: `Topic ${r.topic_id} not found`, code: "23503" });
    Object.assign(r, p);
  }
}

function duplicateError(): QueryError {
  return new QueryError({
    message: 'duplicate key value violates unique constraint "questions_question_answer_key"',
    code: "23505",
  });
}

async function checkQuestionDuplicates(db: Db, rows: Document[], excludeIds: string[] = []) {
  const seen = new Set<string>();
  for (const r of rows) {
    const k = JSON.stringify([r.question, r.answer]);
    if (seen.has(k)) throw duplicateError();
    seen.add(k);
  }
  const clash = await db.collection("questions").findOne({
    $or: rows.map((r) => ({ question: r.question, answer: r.answer })),
    id: { $nin: excludeIds },
  });
  if (clash) {
    const e = duplicateError();
    e.err.details = `Existing question id ${clash.id}`;
    throw e;
  }
}

// An empty solutions box ([""] / []) is stored as null, like most prod questions,
// so saving a question without a solution is not a "change".
function cleanSolutions(row: Document) {
  if (Array.isArray(row.solutions) && row.solutions.every((x: unknown) => typeof x !== "string" || !x.trim())) {
    row.solutions = null;
  }
}

// ---------- actions ----------
async function doSelect(db: Db, b: Body) {
  const cursor = db.collection(b.table).find(buildFilter(b.filters));
  if (b.order?.length) cursor.sort(Object.fromEntries(b.order.map((o) => [o.column, o.ascending ? 1 : -1])));
  return applySelect(db, await cursor.toArray(), parseColumns(b.columns));
}

async function doInsert(db: Db, b: Body) {
  const input = Array.isArray(b.values) ? b.values : [b.values ?? {}];
  const now = new Date();
  const rows: Document[] = input.map((v) => {
    const { _id, ...rest } = v;
    const base: Document = { id: randomUUID(), created_at: now, updated_at: now };
    if (b.table !== "paragraphs") base.is_active = true;
    if (b.table === "questions") Object.assign(base, QUESTION_DEFAULTS);
    if (["courses", "subjects", "chapters", "topics"].includes(b.table)) base.description = null;
    return { ...base, ...rest };
  });
  if (b.table === "questions") rows.forEach(cleanSolutions);
  await withParents(db, b.table, rows);
  if (b.table === "questions") await checkQuestionDuplicates(db, rows);
  try {
    await db.collection(b.table).insertMany(rows, { ordered: true });
  } catch (e: any) {
    // all-or-nothing, like the Postgres insert it replaces
    await db.collection(b.table).deleteMany({ id: { $in: rows.map((r) => r.id) } });
    if (e?.code === 11000) throw new QueryError({ message: `duplicate key value violates unique constraint (${b.table})`, code: "23505", details: e.message });
    throw e;
  }
  return b.returning ? applySelect(db, rows, parseColumns(b.columns)) : null;
}

async function doUpdate(db: Db, b: Body) {
  if (!b.filters?.length) throw new QueryError({ message: "UPDATE requires a filter" });
  const { _id, id, created_at, ...values } = (b.values ?? {}) as Document;
  const filter = buildFilter(b.filters);
  const coll = db.collection(b.table);
  const targets = await coll.find(filter, { projection: { id: 1, question: 1, answer: 1 } }).toArray();
  const ids = targets.map((t) => t.id);
  if (!ids.length) return b.returning ? [] : null;

  values.updated_at = new Date();
  if (b.table === "questions" && "solutions" in values) cleanSolutions(values);
  if ("topic_id" in values) await withParents(db, b.table, [values]);
  if (b.table === "questions" && ("question" in values || "answer" in values)) {
    if (ids.length > 1 && "question" in values) throw duplicateError();
    await checkQuestionDuplicates(
      db,
      targets.map((t) => ({ question: values.question ?? t.question, answer: values.answer ?? t.answer })),
      ids,
    );
  }
  try {
    await coll.updateMany({ id: { $in: ids } }, { $set: values });
  } catch (e: any) {
    if (e?.code === 11000) throw new QueryError({ message: `duplicate key value violates unique constraint (${b.table})`, code: "23505", details: e.message });
    throw e;
  }
  if (!b.returning) return null;
  return applySelect(db, await coll.find({ id: { $in: ids } }).toArray(), parseColumns(b.columns));
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ data: null, error: { message: "Invalid JSON" } }, { status: 400 });
  }
  try {
    if (!TABLES.has(body.table)) throw new QueryError({ message: `Unknown table ${body.table}` });
    const db = await getDb();
    let data: Document[] | null;
    if (body.action === "select") data = await doSelect(db, body);
    else if (body.action === "insert") data = await doInsert(db, body);
    else if (body.action === "update") data = await doUpdate(db, body);
    else throw new QueryError({ message: `Unknown action ${body.action}` });

    if (body.single) {
      if (!data || data.length !== 1)
        throw new QueryError({ message: "JSON object requested, multiple (or no) rows returned", code: "PGRST116" });
      return NextResponse.json({ data: data[0], error: null });
    }
    return NextResponse.json({ data, error: null });
  } catch (e: any) {
    const error: DbError = e instanceof QueryError ? e.err : { message: e?.message || String(e) };
    if (!(e instanceof QueryError)) console.error("[api/db]", e);
    return NextResponse.json({ data: null, error }, { status: e instanceof QueryError ? 400 : 500 });
  }
}

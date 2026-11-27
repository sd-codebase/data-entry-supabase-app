// load-medical.mjs [--load]  -> loads emt-dev-data/mhtcet/pcb-medical/staging/*/questions.json into LOCAL dev db mht-cet-pcb.
// Default = DRY RUN (reports counts, chapter mapping problems, exact duplicates vs existing). --load inserts (idempotent: removes previous rows of this batch first).
import { MongoClient } from "mongodb";
import { readFileSync, readdirSync, existsSync } from "fs";
import { randomUUID } from "crypto";
const D = "/Volumes/DevStorage/code/emt-dev-data/mhtcet/pcb-medical";
const BATCH = "mhtcet-pcb-medical-2026-11";
const LOAD = process.argv.includes("--load");
const c = await new MongoClient("mongodb://127.0.0.1:27019").connect();
const db = c.db("mht-cet-pcb");
const subjects = await db.collection("subjects").find().toArray();
const subjByName = Object.fromEntries(subjects.map((s) => [s.name, s]));
const chapters = await db.collection("chapters").find().toArray();
const topics = await db.collection("topics").find().toArray();
const norm = (t) => String(t || "").toLowerCase().replace(/\$/g, "").replace(/\\[a-z]+/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const key = (q) => norm(q.question) + "|" + norm(Object.values(q.options || {}).join(" "));
// new chapter: Green Chemistry and Nanochemistry
async function ensureChapter(subject, name) {
  let ch = chapters.find((x) => x.subject_id === subject.id && x.name === name);
  if (ch) return ch;
  if (!LOAD) return { id: "NEW", name, subject_id: subject.id, _new: true };
  const now = new Date();
  const order = Math.max(...chapters.filter((x) => x.subject_id === subject.id).map((x) => x.order_num || 0)) + 1;
  ch = { id: randomUUID(), name, order_num: order, subject_id: subject.id, description: null, is_active: true, created_at: now, updated_at: now };
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const tp = { id: randomUUID(), name, order_num: 1, chapter_id: ch.id, resources_directory: `${subject.name.toLowerCase()}/${slug}`, description: null, is_active: true, created_at: now, updated_at: now };
  await db.collection("chapters").insertOne(ch); await db.collection("topics").insertOne(tp);
  chapters.push(ch); topics.push(tp);
  console.log("created chapter", name);
  return ch;
}
const jobs = existsSync(`${D}/staging`) ? readdirSync(`${D}/staging`).filter((j) => existsSync(`${D}/staging/${j}/questions.json`)).sort() : [];
const rows = []; const problems = [];
for (const j of jobs) {
  const job = JSON.parse(readFileSync(`${D}/jobs/${j}.json`));
  const subject = subjByName[job.subject];
  const Q = JSON.parse(readFileSync(`${D}/staging/${j}/questions.json`));
  for (const q of Q) {
    if (q.year && q.year >= 2024) { problems.push(`${j} q${q.sr_no}: year ${q.year} must be skipped`); continue; }
    const cname = (q.chapter || "").replace(/\s*\(NEW\)\s*$/, "").trim();
    let ch = chapters.find((x) => x.subject_id === subject.id && x.name === cname);
    if (!ch && cname === "Green Chemistry and Nanochemistry") ch = await ensureChapter(subject, cname);
    if (!ch) { problems.push(`${j} q${q.sr_no}: unknown chapter "${q.chapter}" (${job.subject})`); continue; }
    rows.push({ job: j, order: rows.length, q, subject, ch });
  }
}
// existing questions for dup check
const existing = await db.collection("questions").find({ "extra.batch": { $ne: BATCH } }, { projection: { question: 1, options: 1, answer: 1, chapter_id: 1, sr_no: 1 } }).toArray();
const exKeys = new Map(existing.map((e) => [key(e), e]));
let dupExisting = [], dupWithin = [], keep = [];
const seen = new Set();
for (const r of rows) {
  const k = key(r.q);
  if (exKeys.has(k)) { dupExisting.push(r); continue; }
  if (seen.has(k)) { dupWithin.push(r); continue; }
  seen.add(k); keep.push(r);
}
const byCh = {}; keep.forEach((r) => { const k = `${r.subject.name} | ${r.ch.name}`; byCh[k] = (byCh[k] || 0) + 1; });
console.log(`jobs ${jobs.length} | staged rows ${rows.length} | exact dup of EXISTING ${dupExisting.length} | dup within new ${dupWithin.length} | to load ${keep.length} | blank answers ${keep.filter((r) => !r.q.answer).length} | no year ${keep.filter((r) => !r.q.year).length}`);
console.log("problems:", problems.length, problems.slice(0, 15));
console.log("per chapter:", Object.entries(byCh).sort().map(([k, v]) => `${k}=${v}`).join("; "));
if (!LOAD) { console.log("DRY RUN (use --load)"); await c.close(); process.exit(0); }
const del = await db.collection("questions").deleteMany({ "extra.batch": BATCH });
const now = new Date(); const nextSr = {}; const docs = [];
for (const r of keep) {
  const ch = r.ch; const topic = topics.find((t) => t.chapter_id === ch.id);
  if (!topic) throw new Error("no topic for " + ch.name);
  if (nextSr[ch.id] == null) { const m = await db.collection("questions").find({ chapter_id: ch.id }).sort({ sr_no: -1 }).limit(1).toArray(); nextSr[ch.id] = (m[0]?.sr_no || 0) + 1; }
  const q = r.q;
  const fixTag = (t) => (typeof t === "string" ? t.replace(/\{\{img_(.*?)_img\}\}/g, (m, f) => `{{img_${/\.(png|jpg|svg)$/.test(f) ? f : f + ".png"}_img}}`) : t);
  const options = Object.fromEntries(Object.entries(q.options || {}).map(([k, v]) => [k, fixTag(v)]));
  docs.push({
    id: randomUUID(), question: fixTag(q.question), options, has_integer_answer: false, answer: q.answer ?? "", solutions: [""], level: q.level,
    is_marked_for_review: false, review_in_app: false, sr_no: nextSr[ch.id]++,
    pyo: q.year ? `MHT CET (PCB) ${q.year}` : "",
    extra: { batch: BATCH, needs_review: q.needs_review?.length ? q.needs_review : null, source_job: r.job, source_sr: q.sr_no, figures: q.figures || [] },
    topic_id: topic.id, chapter_id: ch.id, subject_id: r.subject.id, course_id: r.subject.course_id,
    is_active: true, verified_in_app: false, important: false, outside_ncert: false, created_at: now, updated_at: now,
  });
}
if (docs.length) await db.collection("questions").insertMany(docs);
console.log(`removed ${del.deletedCount} old rows, inserted ${docs.length}`);
await c.close();

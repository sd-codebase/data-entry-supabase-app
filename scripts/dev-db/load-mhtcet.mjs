// load-mhtcet.mjs <slug> [batch]  -> inserts staging/<slug>/questions.json into LOCAL dev db mht-cet-pcm.
// Re-running for the same slug first removes that slug's previous rows of the same batch (idempotent).
import { MongoClient } from "mongodb";
import { readFileSync, existsSync, copyFileSync, mkdirSync, readdirSync } from "fs";
import { randomUUID } from "crypto";
import path from "path";
const [slug, batch = "mhtcet-pcm-maths-2026-11"] = process.argv.slice(2);
const D = "/Volumes/DevStorage/code/emt-dev-data";
const COURSE = process.env.MHT_COURSE || "pcm"; // pcm | pcb
const SUBJ = process.env.MHT_SUBJ || "maths"; // maths | physics | chemistry
const man = JSON.parse(readFileSync(`${D}/mhtcet/${COURSE}-${SUBJ}/manifest.json`)).find((m) => m.slug === slug);
if (!man) throw new Error("unknown slug " + slug);
const stg = `${D}/mhtcet/${COURSE}-${SUBJ}/staging/${slug}`;
// questions.json, or several questions.<from>-<to>.json parts (big chapters) merged in sr_no order
const parts = readdirSync(stg).filter((f) => /^questions(\.\d+-\d+)?\.json$/.test(f));
const DROP_BELOW = Number(process.env.DROP_BELOW || 0); // e.g. DROP_BELOW=7 skips sr_no 1-6
const Q = parts.flatMap((f) => JSON.parse(readFileSync(`${stg}/${f}`))).filter((q) => q.sr_no >= DROP_BELOW).sort((a, b) => a.sr_no - b.sr_no);
if (new Set(Q.map((q) => q.sr_no)).size !== Q.length) throw new Error("duplicate sr_no across parts");
const c = await new MongoClient("mongodb://127.0.0.1:27019").connect();
const col = c.db(`mht-cet-${COURSE}`).collection("questions");
const del = await col.deleteMany({ topic_id: man.topic_id, "extra.batch": batch });
const now = new Date();
let figs = 0, missingFigs = 0;
const docs = Q.map((q) => {
  for (const f of q.figures || []) {
    const src = `${stg}/figures/${f.tag}`;
    if (!existsSync(src)) { missingFigs++; continue; } // placeholder stays in the text; image added later (user 2026-11-17)
    mkdirSync(`${D}/images/mhtcet${COURSE}/${man.resources_directory}`, { recursive: true });
    copyFileSync(src, `${D}/images/mhtcet${COURSE}/${man.resources_directory}/${f.tag}`); figs++;
  }
  // renderer convention: the tag carries the file extension ({{img_<file>.png_img}})
  const fixTag = (t) => (typeof t === "string" ? t.replace(/\{\{img_(.*?)_img\}\}/g, (m, f) => `{{img_${/\.(png|jpg|svg)$/.test(f) ? f : f + ".png"}_img}}`) : t);
  q.question = fixTag(q.question);
  if (q.options) for (const k of Object.keys(q.options)) q.options[k] = fixTag(q.options[k]);
  const flags = q.needs_review?.length ? q.needs_review : null;
  return {
    id: randomUUID(), question: q.question, options: q.options, has_integer_answer: false,
    answer: q.answer ?? "", solutions: [""], level: q.level, is_marked_for_review: false, review_in_app: false,
    sr_no: q.sr_no, pyo: q.pyo, extra: { batch, needs_review: flags },
    topic_id: man.topic_id, chapter_id: man.chapter_id, subject_id: man.subject_id, course_id: man.course_id,
    is_active: true, verified_in_app: false, important: false, outside_ncert: false, created_at: now, updated_at: now,
  };
});
await col.insertMany(docs);
const seen = new Map(); let dups = 0;
for (const d of docs) { const k = d.question + "|" + d.answer; if (seen.has(k)) dups++; seen.set(k, 1); }
console.log(`${slug}: removed ${del.deletedCount} old, inserted ${docs.length}, figures copied ${figs}, placeholders without file ${missingFigs}, same question+answer duplicates inside chapter: ${dups}, blank answers: ${docs.filter((d) => !d.answer).length}`);
await c.close();

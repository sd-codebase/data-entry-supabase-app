// seed-mhtcet-pcb.mjs -> creates the MHT-CET (PCB) course in its OWN dev db `mht-cet-pcb` (subjects Physics, Chemistry, Biology; 1 topic per chapter). Idempotent.
import { MongoClient } from "mongodb";
import { readdirSync, mkdirSync, writeFileSync, statSync } from "fs";
import { randomUUID } from "crypto";
import path from "path";
const SRC = path.join(process.env.HOME, "Downloads/MHT-CET/PCB");
const DATA = "/Volumes/DevStorage/code/emt-dev-data";
const slug = (s) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const walk = (d) => readdirSync(d).flatMap((n) => { const p = path.join(d, n); return statSync(p).isDirectory() ? walk(p) : p.endsWith(".pdf") ? [p] : []; });
const c = await new MongoClient("mongodb://127.0.0.1:27019").connect();
const db = c.db("mht-cet-pcb");
if (await db.collection("courses").countDocuments()) { console.log("already seeded"); process.exit(0); }
const now = new Date(), base = { description: null, is_active: true, created_at: now, updated_at: now };
const course = { id: randomUUID(), name: "MHT-CET (PCB)", ...base };
const subjects = [], chapters = [], topics = [];
for (const Name of ["Physics", "Chemistry", "Biology"]) {
  const key = Name.toLowerCase();
  const subject = { id: randomUUID(), name: Name, course_id: course.id, ...base };
  subjects.push(subject);
  const manifest = []; let n = 0;
  const files = walk(path.join(SRC, Name)).sort((a, b) => a.localeCompare(b));
  for (const f of files) {
    const group = path.basename(path.dirname(f));
    const name = path.basename(f).replace(/^MHT CET (\(Biology\) )?/, "").replace(/ Previous Year Questions with Answer Key\.pdf$/, "");
    const ch = { id: randomUUID(), name, order_num: ++n, subject_id: subject.id, ...base };
    const dir = `${key}/${slug(name)}`;
    if (manifest.some((m) => m.slug === slug(name))) throw new Error("duplicate slug " + name);
    const tp = { id: randomUUID(), name, order_num: 1, chapter_id: ch.id, resources_directory: dir, ...base };
    chapters.push(ch); topics.push(tp);
    mkdirSync(path.join(DATA, "images/mhtcetpcb", dir), { recursive: true });
    manifest.push({ group, chapter: name, pdf: f, chapter_id: ch.id, topic_id: tp.id, subject_id: subject.id, course_id: course.id, resources_directory: dir, slug: slug(name) });
  }
  mkdirSync(path.join(DATA, `mhtcet/pcb-${key}/staging`), { recursive: true });
  writeFileSync(path.join(DATA, `mhtcet/pcb-${key}/manifest.json`), JSON.stringify(manifest, null, 1));
  console.log(Name, manifest.length, "chapters");
}
await db.collection("courses").insertOne(course);
await db.collection("subjects").insertMany(subjects);
await db.collection("chapters").insertMany(chapters);
await db.collection("topics").insertMany(topics);
for (const k of ["paragraphs", "questions", "set_tests"]) await db.createCollection(k).catch(() => {});
console.log(`seeded PCB: ${subjects.length} subjects, ${chapters.length} chapters`);
await c.close();

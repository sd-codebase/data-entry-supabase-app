// Creates the MHT-CET (PCM) course tree in the LOCAL dev Mongo (idempotent: skips if course exists).
// Usage: node scripts/dev-db/seed-mhtcet-pcm.mjs   (maths only for now; physics/chemistry added later as sibling subjects)
import { MongoClient } from "mongodb";
import { readdirSync, mkdirSync, writeFileSync, statSync } from "fs";
import { randomUUID } from "crypto";
import path from "path";
const SRC = process.env.MHT_SRC || path.join(process.env.HOME, "Downloads/MHT-CET/PCM");
const DATA = "/Volumes/DevStorage/code/emt-dev-data";
const slug = (s) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const c = await new MongoClient("mongodb://127.0.0.1:27019").connect();
const db = c.db("mht-cet-pcm");
if (await db.collection("courses").countDocuments()) { console.log("course already exists – nothing done"); process.exit(0); }
const now = new Date();
const base = { description: null, is_active: true, created_at: now, updated_at: now };
const course = { id: randomUUID(), name: "MHT-CET (PCM)", ...base };
const subject = { id: randomUUID(), name: "Mathematics", course_id: course.id, ...base };
const chapters = [], topics = [], manifest = [];
let n = 0;
for (const group of readdirSync(path.join(SRC, "Maths")).filter((g) => statSync(path.join(SRC, "Maths", g)).isDirectory()).sort()) {
  const files = readdirSync(path.join(SRC, "Maths", group)).filter((f) => f.endsWith(".pdf")).sort();
  for (const f of files) {
    const name = f.replace(/^MHT CET /, "").replace(/ Previous Year Questions with Answer Key\.pdf$/, "");
    const ch = { id: randomUUID(), name, order_num: ++n, subject_id: subject.id, ...base };
    const dir = `maths/${slug(name)}`;
    const tp = { id: randomUUID(), name, order_num: 1, chapter_id: ch.id, resources_directory: dir, ...base };
    chapters.push(ch); topics.push(tp);
    mkdirSync(path.join(DATA, "images/mhtcetpcm", dir), { recursive: true });
    manifest.push({ group, chapter: name, pdf: path.join(SRC, "Maths", group, f), chapter_id: ch.id, topic_id: tp.id, subject_id: subject.id, course_id: course.id, resources_directory: dir, slug: slug(name) });
  }
}
await db.collection("courses").insertOne(course);
await db.collection("subjects").insertOne(subject);
await db.collection("chapters").insertMany(chapters);
await db.collection("topics").insertMany(topics);
for (const k of ["paragraphs", "questions", "set_tests"]) await db.createCollection(k).catch(() => {});
writeFileSync(path.join(DATA, "mhtcet/pcm-maths/manifest.json"), JSON.stringify(manifest, null, 1));
console.log(`seeded: 1 course, 1 subject, ${chapters.length} chapters, ${topics.length} topics`);
await c.close();

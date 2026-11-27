// seed-mhtcet-pcm-subject.mjs <physics|chemistry>  -> adds the subject + its chapters/topics to the existing MHT-CET (PCM) dev course. Idempotent.
import { MongoClient } from "mongodb";
import { readdirSync, mkdirSync, writeFileSync, statSync } from "fs";
import { randomUUID } from "crypto";
import path from "path";
const key = process.argv[2];
if (!["physics", "chemistry"].includes(key)) throw new Error("usage: physics|chemistry");
const Name = key[0].toUpperCase() + key.slice(1);
const SRC = path.join(process.env.HOME, "Downloads/MHT-CET/PCM", Name);
const DATA = "/Volumes/DevStorage/code/emt-dev-data";
const slug = (s) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const c = await new MongoClient("mongodb://127.0.0.1:27019").connect();
const db = c.db("mht-cet-pcm");
const course = await db.collection("courses").findOne({ name: "MHT-CET (PCM)" });
if (await db.collection("subjects").findOne({ course_id: course.id, name: Name })) { console.log(Name, "already seeded"); process.exit(0); }
const now = new Date(), base = { description: null, is_active: true, created_at: now, updated_at: now };
const subject = { id: randomUUID(), name: Name, course_id: course.id, ...base };
const chapters = [], topics = [], manifest = []; let n = 0;
for (const group of readdirSync(SRC).filter((g) => statSync(path.join(SRC, g)).isDirectory()).sort()) {
  for (const f of readdirSync(path.join(SRC, group)).filter((f) => f.endsWith(".pdf")).sort()) {
    const name = f.replace(/^MHT CET /, "").replace(/ Previous Year Questions with Answer Key\.pdf$/, "");
    const ch = { id: randomUUID(), name, order_num: ++n, subject_id: subject.id, ...base };
    const dir = `${key}/${slug(name)}`;
    const tp = { id: randomUUID(), name, order_num: 1, chapter_id: ch.id, resources_directory: dir, ...base };
    chapters.push(ch); topics.push(tp);
    mkdirSync(path.join(DATA, "images/mhtcetpcm", dir), { recursive: true });
    manifest.push({ group, chapter: name, pdf: path.join(SRC, group, f), chapter_id: ch.id, topic_id: tp.id, subject_id: subject.id, course_id: course.id, resources_directory: dir, slug: slug(name) });
  }
}
await db.collection("subjects").insertOne(subject);
await db.collection("chapters").insertMany(chapters);
await db.collection("topics").insertMany(topics);
mkdirSync(path.join(DATA, `mhtcet/pcm-${key}/staging`), { recursive: true });
writeFileSync(path.join(DATA, `mhtcet/pcm-${key}/manifest.json`), JSON.stringify(manifest, null, 1));
console.log(`${Name}: 1 subject, ${chapters.length} chapters, ${topics.length} topics`);
await c.close();

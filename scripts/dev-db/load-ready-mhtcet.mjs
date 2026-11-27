// load-ready-mhtcet.mjs <subject> : loads every chapter whose ALL job parts exist in staging and that has no questions in the DB yet.
import { MongoClient } from "mongodb";
import { readFileSync, readdirSync, existsSync } from "fs";
import { execFileSync } from "child_process";
const subject = process.argv[2];
const COURSE = process.env.MHT_COURSE || "pcm";
const D = "/Volumes/DevStorage/code/emt-dev-data/mhtcet";
const jobs = JSON.parse(readFileSync(`${D}/${COURSE === "pcm" ? "pc" : COURSE}-jobs.json`)).filter((j) => j.subject === subject);
const need = {};
for (const j of jobs) (need[j.slug] ||= []).push(j.range ? `questions.${j.range[0]}-${j.range[1]}.json` : "questions.json");
const man = JSON.parse(readFileSync(`${D}/${COURSE}-${subject}/manifest.json`));
const c = await new MongoClient("mongodb://127.0.0.1:27019").connect();
const col = c.db(`mht-cet-${COURSE}`).collection("questions");
for (const m of man) {
  const dir = `${D}/${COURSE}-${subject}/staging/${m.slug}`;
  const files = need[m.slug] || [];
  const have = existsSync(dir) ? new Set(readdirSync(dir)) : new Set();
  if (!files.length || !files.every((f) => have.has(f))) continue;
  if (await col.countDocuments({ topic_id: m.topic_id })) continue;
  execFileSync("python3", [`${D}/_tools/regen_figures.py`, subject, m.slug], { stdio: "ignore", env: { ...process.env, MHT_COURSE: COURSE } });
  const out = execFileSync("node", ["scripts/dev-db/load-mhtcet.mjs", m.slug], { env: { ...process.env, MHT_SUBJ: subject, MHT_COURSE: COURSE } }).toString().trim();
  console.log(out);
}
await c.close();

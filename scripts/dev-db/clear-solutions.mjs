#!/usr/bin/env node
// Remove question solutions in the LOCAL dev database (never touches production).
//
//   node scripts/dev-db/clear-solutions.mjs <exam|all>            dry run: report only
//   node scripts/dev-db/clear-solutions.mjs <exam|all> --apply    save solutions to a JSON file, then clear them
//   node scripts/dev-db/clear-solutions.mjs restore <file.json>   put saved solutions back
//
// "Clear" = set `solutions` to null (what the admin app stores for an empty solution).
// verified_in_app is left as it is. Images used only by solutions become unused; quarantine
// them afterwards with clean-images.mjs.

import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { MongoClient } = require("mongodb");
const { EXAMS } = require("../../src/config/exams.js");

const DEV_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27019";
const DEV_DATA = process.env.EMT_DEV_DATA || "/Volumes/DevStorage/code/emt-dev-data";
const SAVE_DIR = path.join(DEV_DATA, "cleared-solutions");

if (!/^(127\.0\.0\.1|localhost)$/.test(new URL(DEV_URI).hostname)) {
  console.error(`Refusing: ${DEV_URI} is not a local dev MongoDB.`);
  process.exit(2);
}

const args = process.argv.slice(2);
const usage = () => {
  console.error("Usage: clear-solutions.mjs <exam|all> [--apply]  |  clear-solutions.mjs restore <file.json>");
  process.exit(2);
};

const hasSolution = (s) => Array.isArray(s) ? s.some((x) => typeof x === "string" && x.trim()) : typeof s === "string" && s.trim() !== "";
const stamp = () => new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);

async function main() {
  const client = new MongoClient(DEV_URI);
  await client.connect();
  try {
    if (args[0] === "restore") {
      if (args.length !== 2) usage();
      const saved = JSON.parse(fs.readFileSync(args[1], "utf8"));
      const db = client.db(saved.db);
      let n = 0;
      for (const r of saved.rows) {
        const res = await db.collection("questions").updateOne({ id: r.id }, { $set: { solutions: r.solutions } });
        n += res.matchedCount;
      }
      console.log(`restored ${n}/${saved.rows.length} questions in ${saved.db}`);
      return;
    }

    const apply = args.includes("--apply");
    const rest = args.filter((a) => a !== "--apply");
    if (rest.length !== 1) usage();
    const keys = rest[0] === "all" ? Object.keys(EXAMS) : [rest[0]];
    for (const k of keys) if (!EXAMS[k]) usage();

    console.log(`TARGET: local dev ${DEV_URI}  (${apply ? "APPLY" : "dry run"})\n`);
    for (const key of keys) {
      const dbName = EXAMS[key].db;
      const coll = client.db(dbName).collection("questions");
      const rows = (await coll.find({ solutions: { $exists: true, $ne: null } }, { projection: { _id: 0, id: 1, solutions: 1 } }).toArray())
        .filter((q) => hasSolution(q.solutions));
      const empties = await coll.countDocuments({ solutions: { $exists: true, $ne: null } }) - rows.length;
      console.log(`${key.padEnd(12)} questions with a solution: ${rows.length}   (empty-but-not-null: ${empties})`);
      if (!apply) continue;
      if (rows.length) {
        fs.mkdirSync(SAVE_DIR, { recursive: true });
        const file = path.join(SAVE_DIR, `${stamp()}-${key}.json`);
        fs.writeFileSync(file, JSON.stringify({ db: dbName, savedAt: new Date().toISOString(), rows }));
        console.log(`  saved to ${file}`);
      }
      // only questions that really have a solution; already-empty ones are left untouched
      // (rewriting [] / [""] to null would show up as a false change in promote)
      const res = await coll.updateMany(
        { id: { $in: rows.map((r) => r.id) } },
        { $set: { solutions: null, updated_at: new Date() } }
      );
      console.log(`  cleared: ${res.modifiedCount}`);
    }
    if (!apply) console.log("\nDry run only. Add --apply to clear.");
  } finally {
    await client.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

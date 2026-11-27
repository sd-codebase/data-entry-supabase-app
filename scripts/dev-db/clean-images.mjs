#!/usr/bin/env node
// Find and quarantine unused images in the LOCAL dev image folders (never touches production).
//
//   node scripts/dev-db/clean-images.mjs <exam|all>            dry run: report only
//   node scripts/dev-db/clean-images.mjs <exam|all> --apply    move unused files to quarantine
//   node scripts/dev-db/clean-images.mjs restore <dir>         put a quarantine back
//
// An image is "used" when any question (active or inactive) or paragraph in the dev DB
// references it as {{img_FILE_img}} / {{imgcell_FILE_imgcell}} under its topic's
// resources_directory. Files whose name is referenced anywhere in the exam are also kept
// (they may be the right file for a link that points to another folder).
// Unused files are MOVED to <dev data>/unused-images/<timestamp>/<exam>/<same path>,
// with a manifest.tsv. Nothing is deleted. Dot files (.gitkeep) are left alone.
//
// Note: devdb:refresh mirrors prod images, so unused files come back after a refresh;
// rerun this script afterwards.

import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { MongoClient } = require("mongodb");
const { EXAMS } = require("../../src/config/exams.js");

const DEV_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27019";
const DEV_DATA = process.env.EMT_DEV_DATA || "/Volumes/DevStorage/code/emt-dev-data";
const IMAGES = path.join(DEV_DATA, "images");
const QUARANTINE = path.join(DEV_DATA, "unused-images");
const REF = /\{\{img(?:cell)?_(.+?)_img(?:cell)?\}\}/g;

if (!/^(127\.0\.0\.1|localhost)$/.test(new URL(DEV_URI).hostname)) {
  console.error(`Refusing: ${DEV_URI} is not a local dev MongoDB.`);
  process.exit(2);
}

const args = process.argv.slice(2);
const usage = () => {
  console.error("Usage: clean-images.mjs <exam|all> [--apply]  |  clean-images.mjs restore <dir>");
  process.exit(2);
};

function walk(dir, base = dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, base, out);
    else if (e.isFile() && !e.name.startsWith(".")) out.push(path.relative(base, full));
  }
  return out;
}

async function auditExam(client, key) {
  const exam = EXAMS[key];
  const db = client.db(exam.db);
  const dirs = new Map(
    (await db.collection("topics").find({}, { projection: { id: 1, resources_directory: 1 } }).toArray()).map((t) => [
      t.id,
      t.resources_directory,
    ]),
  );
  const used = new Set();
  const names = new Set();
  let missing = 0;
  const root = path.join(IMAGES, exam.imagesFolder);
  const scan = async (coll, fields) => {
    const proj = Object.fromEntries([...fields, "topic_id"].map((f) => [f, 1]));
    for await (const d of db.collection(coll).find({}, { projection: proj })) {
      const text = JSON.stringify(fields.map((f) => d[f]));
      for (const m of text.matchAll(REF)) {
        // tolerate a doubled tag typo like {{img_{{img_FILE_img}}
        m[1] = m[1].replace(/^(\{\{img(?:cell)?_)+/, "");
        names.add(m[1]);
        const dir = dirs.get(d.topic_id);
        if (!dir) continue;
        const rel = path.join(dir, m[1]);
        if (!used.has(rel) && !fs.existsSync(path.join(root, rel))) missing++;
        used.add(rel);
      }
    }
  };
  await scan("questions", ["question", "options", "solutions", "answer"]);
  await scan("paragraphs", ["content"]);

  const files = walk(root);
  const unused = files.filter((f) => !used.has(f) && !names.has(path.basename(f)));
  const bytes = unused.reduce((s, f) => s + fs.statSync(path.join(root, f)).size, 0);
  return { key, root, files, unused, bytes, missing };
}

async function main() {
  if (args[0] === "restore") {
    if (args.length !== 2) usage();
    const dir = path.resolve(args[1]);
    if (!dir.startsWith(QUARANTINE + path.sep)) {
      console.error(`Not a quarantine folder under ${QUARANTINE}`);
      process.exit(2);
    }
    let n = 0;
    for (const exam of fs.readdirSync(dir).filter((e) => EXAMS[e])) {
      for (const rel of walk(path.join(dir, exam))) {
        const dst = path.join(IMAGES, EXAMS[exam].imagesFolder, rel);
        if (fs.existsSync(dst)) {
          console.log(`skip (exists): ${exam}/${rel}`);
          continue;
        }
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.renameSync(path.join(dir, exam, rel), dst);
        n++;
      }
    }
    console.log(`Restored ${n} files from ${dir}`);
    return;
  }

  const target = args[0];
  const apply = args[1] === "--apply";
  if (!target || args.length > 2 || (args[1] && !apply)) usage();
  const keys = target === "all" ? Object.keys(EXAMS) : [target];
  if (!keys.every((k) => EXAMS[k])) usage();

  const client = await new MongoClient(DEV_URI, { serverSelectionTimeoutMS: 5000 }).connect().catch((e) => {
    console.error(`Cannot reach dev MongoDB at ${DEV_URI}. Run "npm run devdb:up". (${e.message})`);
    process.exit(1);
  });
  try {
    console.log(`TARGET: local dev images ${IMAGES}  (${apply ? "APPLY: move to quarantine" : "dry run"})\n`);
    const results = [];
    for (const k of keys) {
      const r = await auditExam(client, k);
      results.push(r);
      console.log(
        `${k.padEnd(12)} files ${String(r.files.length).padStart(5)}  unused ${String(r.unused.length).padStart(5)}` +
          `  ${(r.bytes / 1e6).toFixed(1)} MB   (referenced but missing: ${r.missing})`,
      );
    }
    if (!apply) {
      console.log("\nDry run only. Add --apply to move unused files to quarantine.");
      return;
    }
    const d = new Date();
    const pad = (x) => String(x).padStart(2, "0");
    const ts = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    const qdir = path.join(QUARANTINE, ts);
    const manifest = ["exam\tpath\tbytes"];
    let n = 0;
    for (const r of results) {
      for (const rel of r.unused) {
        const src = path.join(r.root, rel);
        const dst = path.join(qdir, r.key, rel);
        manifest.push(`${r.key}\t${rel}\t${fs.statSync(src).size}`);
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.renameSync(src, dst);
        n++;
      }
    }
    if (n) fs.writeFileSync(path.join(qdir, "manifest.tsv"), manifest.join("\n") + "\n");
    console.log(n ? `\nMoved ${n} files to ${qdir}\nUndo: npm run devdb:clean-images -- restore ${qdir}` : "\nNothing to move.");
  } finally {
    await client.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

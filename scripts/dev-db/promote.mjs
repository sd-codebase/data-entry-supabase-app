#!/usr/bin/env node
// Promote dev content to production (one exam at a time).
//
//   node scripts/dev-db/promote.mjs <exam>            dry run: report only, writes nothing
//   node scripts/dev-db/promote.mjs <exam> --apply    back up prod, then apply
//   node scripts/dev-db/promote.mjs rollback <log>    undo one promotion
//
// Rules
// - Compares dev vs prod by `id` for: courses subjects chapters topics paragraphs questions set_tests.
// - FULL SYNC (user rule 2026-11-27): every new/changed item goes, no checks (active, verified, duplicates: none).
//   Prod's own unique index (question+answer) could still reject a write -> the run rolls back and reports it.
// - Never deletes in prod. Items only in prod are reported, not touched.
// - Images: new/changed files are copied (never deleted); overwritten prod files are kept in a backup dir.
// - Before applying: mongodump of the prod database on the VPS. Every write is logged so `rollback` can undo it.
//
// Test mode (no VPS): --target-uri <mongo uri> --target-db <db> --target-images <dir>

import { spawn, execFileSync } from "child_process";
import fs from "fs";
import net from "net";
import os from "os";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { MongoClient, BSON } = require("mongodb");
const EJSON = BSON.EJSON; // logs keep exact Mongo types (dates, 64-bit ints)
const EXACT = { promoteValues: false }; // keep BSON number types exact
const { EXAMS } = require("../../src/config/exams.js");

const DEV_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27019";
const DEV_DATA = process.env.EMT_DEV_DATA || "/Volumes/DevStorage/code/emt-dev-data";
const VPS_HOST = process.env.VPS_HOST || "root@189.72.146.80";
const VPS_KEY = process.env.VPS_KEY || path.join(os.homedir(), ".ssh/id_ed25519");
const VPS_MONGO_CFG = "/root/.emt-backup-mongo.yaml";
const PROMO_DIR = path.join(DEV_DATA, "promotions");

// prod backend folder per exam (holds .env with the app's Mongo user, and resources-data)
const BACKEND_DIR = {
  jeemains: "/var/www/apps/python-app-be",
  neet: "/var/www/apps/neet-backend",
  jeeadvanced: "/var/www/apps/jeeadvanced-backend",
  mpscgs: "/var/www/apps/mpscgs-backend",
};

// parents first (rollback runs in reverse)
const COLLECTIONS = ["courses", "subjects", "chapters", "topics", "paragraphs", "questions", "set_tests"];
const IGNORE_FIELDS = new Set(["_id", "updated_at"]); // a save with no real change is not a change

// ---------------- helpers ----------------
const args = process.argv.slice(2);
// Reject anything unexpected: a mistyped or unsplit option must never fall back to production.
{
  const valued = new Set(["--target-uri", "--target-db", "--target-images", "--confirm"]);
  const known = new Set([...valued, "--apply", "--solutions-only"]);
  const positional = args[0] === "rollback" ? 2 : 1;
  for (let i = positional; i < args.length; i++) {
    if (!known.has(args[i])) {
      console.error(`Unknown argument: ${JSON.stringify(args[i])}`);
      process.exit(2);
    }
    if (valued.has(args[i])) {
      if (!args[i + 1] || args[i + 1].startsWith("--")) {
        console.error(`${args[i]} needs a value`);
        process.exit(2);
      }
      i++;
    }
  }
  const t = ["--target-uri", "--target-db", "--target-images"].filter((o) => args.includes(o));
  if (t.length && t.length !== 3) {
    console.error("Test mode needs all of --target-uri, --target-db and --target-images");
    process.exit(2);
  }
}
const flag = (name) => args.includes(name);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
async function confirmProd(examKey) {
  // Non-interactive confirmation (e.g. "! node ... --apply --confirm <exam>"): the typed exam name must match exactly.
  if (opt("--confirm") !== undefined) {
    if (opt("--confirm") !== examKey) throw new Error("--confirm does not match the exam name. Nothing was changed.");
    return;
  }
  if (!process.stdin.isTTY) throw new Error("Applying to PRODUCTION needs an interactive terminal to confirm.");
  const rl = (await import("readline")).createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((r) => rl.question(`\nType the exam name (${examKey}) to apply these changes to PRODUCTION: `, r));
  rl.close();
  if (answer.trim() !== examKey) throw new Error("Not confirmed. Nothing was changed.");
}
const ts = () => new Date().toISOString().replace(/[-:]/g, "").replace(/\..*/, "").replace("T", "-");
const sshArgs = ["-o", "ConnectTimeout=15", "-o", "BatchMode=yes", "-i", VPS_KEY, VPS_HOST];
const ssh = (cmd) => execFileSync("ssh", [...sshArgs, cmd], { encoding: "utf8", maxBuffer: 64 << 20 });

function norm(v) {
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map(norm);
  if (v && typeof v === "object") {
    if (typeof v.toHexString === "function") return v.toHexString();
    // numbers: compare by value, not by BSON type (Int32 1 == Double 1)
    if (["Int32", "Double", "Long", "Decimal128"].includes(v._bsontype)) return Number(v.toString());
    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = norm(v[k]);
    return out;
  }
  return v;
}
function changedFields(dev, prod) {
  const keys = new Set([...Object.keys(dev), ...Object.keys(prod)]);
  return [...keys].filter((k) => !IGNORE_FIELDS.has(k) && JSON.stringify(norm(dev[k])) !== JSON.stringify(norm(prod[k])));
}
function stripId(doc) {
  const { _id, ...rest } = doc;
  return rest;
}

async function freePort() {
  return new Promise((res) => {
    const s = net.createServer();
    s.listen(0, "127.0.0.1", () => {
      const p = s.address().port;
      s.close(() => res(p));
    });
  });
}

// ---------------- targets ----------------
async function openProd(examKey) {
  const exam = EXAMS[examKey];
  if (opt("--target-uri")) {
    // test mode: a local database plays "prod"
    const client = await new MongoClient(opt("--target-uri"), EXACT).connect();
    return {
      db: client.db(opt("--target-db") || exam.db),
      imagesDir: opt("--target-images"),
      test: true,
      close: () => client.close(),
    };
  }
  const envLine = ssh(`grep '^MONGODB_URL=' ${BACKEND_DIR[examKey]}/.env`).trim();
  const url = new URL(envLine.replace(/^MONGODB_URL=/, ""));
  const port = await freePort();
  const tunnel = spawn("ssh", ["-N", "-L", `${port}:127.0.0.1:27017`, ...sshArgs], { stdio: "ignore" });
  url.host = `127.0.0.1:${port}`;
  let client;
  for (let i = 0; i < 30; i++) {
    try {
      client = await new MongoClient(url.toString(), { ...EXACT, serverSelectionTimeoutMS: 2000 }).connect();
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  if (!client) {
    tunnel.kill();
    throw new Error("Could not connect to prod Mongo through the SSH tunnel");
  }
  return {
    db: client.db(exam.db),
    imagesDir: `${BACKEND_DIR[examKey]}/resources-data/${exam.imagesFolder}`,
    test: false,
    close: async () => {
      await client.close();
      tunnel.kill();
    },
  };
}

// ---------------- plan ----------------
async function buildPlan(dev, prod) {
  const plan = {};
  for (const c of COLLECTIONS) {
    const [d, p] = await Promise.all([dev.collection(c).find().toArray(), prod.collection(c).find().toArray()]);
    const pById = new Map(p.map((x) => [x.id, x]));
    const dIds = new Set(d.map((x) => x.id));
    const items = [];
    for (const doc of d) {
      const before = pById.get(doc.id);
      if (!before) items.push({ id: doc.id, kind: "new", doc });
      else {
        const fields = changedFields(doc, before);
        if (fields.length) items.push({ id: doc.id, kind: "changed", fields, doc, before });
      }
    }
    plan[c] = { items, prodOnly: p.filter((x) => !dIds.has(x.id)).map((x) => x.id) };
  }

  // questions (user rule 2026-11-27): FULL SYNC, no checks at all — active or not, verified or not, everything new/changed goes.
  return plan;
}

// ---------------- --solutions-only mode ----------------
// Clears `solutions` in prod for every question whose dev solution is empty while prod still has one
// (verified or not). Only that field is written. Images used only by those solutions are moved to a
// backup folder on the target (rollback moves them back).
const hasSolution = (s) =>
  Array.isArray(s) ? s.some((x) => typeof x === "string" && x.trim()) : typeof s === "string" && s.trim() !== "";
const IMG_REF = /\{\{img(?:cell)?_(.+?)_img(?:cell)?\}\}/g;
const refsIn = (v) => [...JSON.stringify(v ?? null).matchAll(IMG_REF)].map((m) => m[1].replace(/^(\{\{img(?:cell)?_)+/, ""));

async function buildSolutionsPlan(dev, prod) {
  const devSol = new Map((await dev.collection("questions").find({}, { projection: { id: 1, solutions: 1 } }).toArray()).map((d) => [d.id, d.solutions]));
  const prodQ = await prod.collection("questions").find().toArray();
  const items = [];
  for (const p of prodQ) {
    if (!devSol.has(p.id) || !hasSolution(p.solutions) || hasSolution(devSol.get(p.id))) continue;
    items.push({ id: p.id, kind: "changed", fields: ["solutions"], doc: { id: p.id, solutions: null }, before: p, label: `sr_no ${p.sr_no}` });
  }
  const plan = Object.fromEntries(COLLECTIONS.map((c) => [c, { items: [], prodOnly: [] }]));
  plan.questions.items = items;
  return { plan, prodQ };
}

async function solutionImagePlan(prod, items, prodQ, prodT) {
  const topics = new Map((await prod.collection("topics").find().toArray()).map((t) => [t.id, t.resources_directory]));
  const clearing = new Set(items.map((i) => i.id));
  const used = new Set(), names = new Set(), cand = new Set();
  for (const q of prodQ) {
    const dir = topics.get(q.topic_id);
    for (const f of refsIn([q.question, q.options])) { names.add(f); if (dir) used.add(path.posix.join(dir, f)); }
    for (const f of refsIn(q.solutions)) {
      if (!dir) { names.add(f); continue; }
      if (clearing.has(q.id)) cand.add(path.posix.join(dir, f));
      else { used.add(path.posix.join(dir, f)); names.add(f); }
    }
  }
  const paraDir = new Map();
  for (const q of prodQ) if (q.paragraph_id && !paraDir.has(q.paragraph_id)) paraDir.set(q.paragraph_id, topics.get(q.topic_id));
  for (const p of await prod.collection("paragraphs").find().toArray()) {
    for (const f of refsIn(p.content)) { names.add(f); const d = paraDir.get(p.id); if (d) used.add(path.posix.join(d, f)); }
  }
  // keep anything still used, or whose file name is referenced anywhere else
  const wanted = [...cand].filter((f) => !used.has(f) && !names.has(path.posix.basename(f)));
  if (!wanted.length) return [];
  if (prodT.test) return wanted.filter((f) => fs.existsSync(path.join(prodT.imagesDir, f)));
  const out = execFileSync("ssh", [...sshArgs, `cd '${prodT.imagesDir}' && while IFS= read -r f; do [ -f "$f" ] && printf '%s\\n' "$f"; done`], { input: wanted.join("\n") + "\n", encoding: "utf8", maxBuffer: 64 << 20 });
  return out.split("\n").filter(Boolean);
}

function moveImages(prodT, files, fromDir, toDir) {
  if (!files.length) return;
  if (prodT.test) {
    for (const f of files) {
      fs.mkdirSync(path.dirname(path.join(toDir, f)), { recursive: true });
      try {
        fs.renameSync(path.join(fromDir, f), path.join(toDir, f));
      } catch (e) {
        if (e.code !== "EXDEV") throw e; // different disk: copy, then remove
        fs.copyFileSync(path.join(fromDir, f), path.join(toDir, f));
        fs.unlinkSync(path.join(fromDir, f));
      }
    }
    return;
  }
  execFileSync("ssh", [...sshArgs, `cd '${fromDir}' && while IFS= read -r f; do mkdir -p "${toDir}/$(dirname "$f")" && mv -n "$f" "${toDir}/$f" || exit 1; done`], { input: files.join("\n") + "\n", encoding: "utf8", maxBuffer: 64 << 20 });
}

function imageNames(doc) {
  const text = JSON.stringify([doc.question, doc.options, doc.solutions, doc.content]);
  return [...text.matchAll(/\{\{img(?:cell)?_(.+?)_img(?:cell)?\}\}/g)].map((m) => m[1]);
}

async function imagePlan(dev, plan, localImages, prodTarget) {
  // images referenced by the questions/paragraphs being promoted
  const topics = new Map((await dev.collection("topics").find().toArray()).map((t) => [t.id, t.resources_directory]));
  const files = new Set();
  for (const c of ["questions", "paragraphs"]) {
    for (const it of plan[c].items.filter((i) => !i.hold)) {
      const dir = topics.get(it.doc.topic_id);
      if (!dir) continue;
      for (const f of imageNames(it.doc)) files.add(path.posix.join(dir, f));
    }
  }
  const list = [...files].filter((f) => fs.existsSync(path.join(localImages, f)));
  const missingLocal = [...files].filter((f) => !fs.existsSync(path.join(localImages, f)));
  if (!list.length) return { copy: [], missingLocal };
  // which ones are new or different in prod (checksum compare, dry run)
  const listFile = path.join(os.tmpdir(), `promote-files-${process.pid}.txt`);
  fs.writeFileSync(listFile, list.join("\n") + "\n");
  const dest = prodTarget.test ? prodTarget.imagesDir + "/" : `${VPS_HOST}:${prodTarget.imagesDir}/`;
  const rsh = prodTarget.test ? [] : ["-e", `ssh -i ${VPS_KEY}`];
  const out = execFileSync("rsync", ["-rcn", "--itemize-changes", `--files-from=${listFile}`, ...rsh, localImages + "/", dest], { encoding: "utf8" });
  const copy = out
    .split("\n")
    .filter((l) => /^[<>]f/.test(l))
    .map((l) => ({ file: l.replace(/^\S+\s+/, ""), isNew: /^[<>]f\+{3}/.test(l) }));
  return { copy, missingLocal, listFile };
}

// ---------------- report ----------------
function printPlan(examKey, plan, img) {
  console.log(`\n=== Promote ${examKey}: dev -> prod ===`);
  console.log("collection   new  changed  held  prod-only");
  for (const c of COLLECTIONS) {
    const p = plan[c];
    const go = p.items.filter((i) => !i.hold);
    const n = go.filter((i) => i.kind === "new").length;
    const ch = go.filter((i) => i.kind === "changed").length;
    const held = p.items.length - go.length;
    console.log(`${c.padEnd(12)} ${String(n).padStart(4)} ${String(ch).padStart(8)} ${String(held).padStart(5)} ${String(p.prodOnly.length).padStart(10)}`);
  }
  for (const c of COLLECTIONS) {
    for (const it of plan[c].items) {
      const label = it.label || it.doc.name || (it.doc.sr_no != null ? `sr_no ${it.doc.sr_no}` : "") || "";
      const what = it.kind === "new" ? "NEW" : `changed: ${it.fields.join(", ")}`;
      console.log(`  ${it.hold ? "HOLD" : "GO  "} ${c}/${it.id} ${label} — ${what}${it.hold ? `  [${it.hold}]` : ""}`);
    }
  }
  console.log(`images to copy: ${img.copy.length} (${img.copy.filter((x) => x.isNew).length} new, ${img.copy.filter((x) => !x.isNew).length} replaced)`);
  for (const x of img.copy) console.log(`  ${x.isNew ? "new " : "repl"} ${x.file}`);
  if (img.missingLocal.length) console.log(`WARNING images referenced but missing locally: ${img.missingLocal.join(", ")}`);
  if (img.solMove) console.log(`solution-only images to move to a backup folder: ${img.solMove.length}`);
}

// ---------------- apply ----------------
async function apply(examKey, plan, img, prodT) {
  const stamp = ts();
  fs.mkdirSync(PROMO_DIR, { recursive: true });
  const logFile = path.join(PROMO_DIR, `${stamp}-${examKey}.json`);
  const log = { exam: examKey, at: new Date().toISOString(), test: prodT.test, target: prodT.test ? opt("--target-uri") : VPS_HOST, db: prodT.db.databaseName, imagesDir: prodT.imagesDir, prodBackup: null, imageBackupDir: null, writes: [], images: [] };
  const save = () => fs.writeFileSync(logFile, EJSON.stringify(log, undefined, 1, { relaxed: false }));

  if (!prodT.test) {
    const archive = `/var/backups/emt/promote/${prodT.db.databaseName}-${stamp}.archive.gz`;
    console.log(`backing up prod database to ${archive} ...`);
    ssh(`mkdir -p /var/backups/emt/promote && mongodump --quiet --config=${VPS_MONGO_CFG} --db='${prodT.db.databaseName}' --gzip --archive='${archive}' && ls -la '${archive}'`);
    log.prodBackup = archive;
  }
  save();

  try {
    // Batched: log the batch (with "before" states for rollback) once, then one bulkWrite per 1,000 docs.
    // (Saving the whole log before every single write made big promotions take hours.)
    const BATCH = 1000;
    for (const c of COLLECTIONS) {
      const items = plan[c].items.filter((i) => !i.hold);
      for (let i = 0; i < items.length; i += BATCH) {
        const part = items.slice(i, i + BATCH);
        for (const it of part) log.writes.push({ collection: c, id: it.id, before: it.before ? stripId(it.before) : null });
        save();
        await prodT.db.collection(c).bulkWrite(
          part.map((it) => ({ updateOne: { filter: { id: it.id }, update: { $set: stripId(it.doc) }, upsert: true } })),
          { ordered: true }
        );
        if (items.length > BATCH) process.stdout.write(`\r${c}: ${Math.min(i + BATCH, items.length)}/${items.length}`);
      }
      if (items.length > BATCH) process.stdout.write("\n");
    }
    if (img.copy.length) {
      const backupDir = prodT.test ? path.join(PROMO_DIR, `${stamp}-${examKey}-images-replaced`) : `/var/backups/emt/promote/${stamp}-${examKey}-images-replaced`;
      log.imageBackupDir = backupDir;
      log.images = img.copy;
      save();
      const files = img.copy.map((x) => x.file);
      fs.writeFileSync(img.listFile, files.join("\n") + "\n");
      const dest = prodT.test ? prodT.imagesDir + "/" : `${VPS_HOST}:${prodT.imagesDir}/`;
      const rsh = prodT.test ? [] : ["-e", `ssh -i ${VPS_KEY}`];
      execFileSync("rsync", ["-rc", "--backup", `--backup-dir=${backupDir}`, `--files-from=${img.listFile}`, ...rsh, path.join(DEV_DATA, "images", EXAMS[examKey].imagesFolder) + "/", dest], { stdio: "inherit" });
    }
    if (img.solMove?.length) {
      log.solImageDir = prodT.test ? path.join(PROMO_DIR, `${stamp}-${examKey}-solution-images`) : `/var/backups/emt/promote/${stamp}-${examKey}-solution-images`;
      log.solImages = img.solMove;
      save();
      moveImages(prodT, img.solMove, prodT.imagesDir, log.solImageDir);
    }
  } catch (e) {
    console.error(`\nERROR during apply: ${e.message}\nRolling back what was written ...`);
    await rollbackWith(prodT, log);
    save();
    throw e;
  }
  console.log(`\nPromoted. ${log.writes.length} documents, ${log.images.length} images${log.solImages ? `, ${log.solImages.length} solution images moved to ${log.solImageDir}` : ""}.\nRollback: npm run devdb:rollback -- ${logFile}`);
}

async function rollbackWith(prodT, log) {
  // Batched undo, newest first, grouped per collection run (keeps the reverse order between collections).
  const rev = [...log.writes].reverse();
  for (let i = 0; i < rev.length; ) {
    const c = rev[i].collection;
    const ops = [];
    while (i < rev.length && rev[i].collection === c && ops.length < 1000) {
      const w = rev[i++];
      ops.push(w.before ? { replaceOne: { filter: { id: w.id }, replacement: w.before } } : { deleteOne: { filter: { id: w.id } } });
    }
    await prodT.db.collection(c).bulkWrite(ops, { ordered: true });
  }
  if (log.images?.length) {
    const newOnes = log.images.filter((x) => x.isNew).map((x) => x.file);
    const replaced = log.images.filter((x) => !x.isNew).map((x) => x.file);
    const q = (s) => `'${s.replace(/'/g, `'\\''`)}'`;
    if (prodT.test) {
      for (const f of newOnes) fs.rmSync(path.join(prodT.imagesDir, f), { force: true });
      for (const f of replaced) fs.copyFileSync(path.join(log.imageBackupDir, f), path.join(prodT.imagesDir, f));
    } else {
      const cmds = [
        ...newOnes.map((f) => `rm -f ${q(path.posix.join(log.imagesDir, f))}`),
        ...replaced.map((f) => `cp -p ${q(path.posix.join(log.imageBackupDir, f))} ${q(path.posix.join(log.imagesDir, f))}`),
      ];
      if (cmds.length) ssh(cmds.join(" && "));
    }
  }
  if (log.solImages?.length) {
    // move solution images back (only those that actually reached the backup folder)
    if (prodT.test) {
      const back = log.solImages.filter((f) => fs.existsSync(path.join(log.solImageDir, f)));
      moveImages(prodT, back, log.solImageDir, log.imagesDir);
    } else {
      execFileSync("ssh", [...sshArgs, `cd '${log.solImageDir}' 2>/dev/null || exit 0; while IFS= read -r f; do [ -f "$f" ] && mkdir -p "${log.imagesDir}/$(dirname "$f")" && mv -n "$f" "${log.imagesDir}/$f"; done; exit 0`], { input: log.solImages.join("\n") + "\n", encoding: "utf8" });
    }
  }
  log.rolledBackAt = new Date().toISOString();
  console.log(`rolled back ${log.writes.length} documents and ${log.images?.length || 0} images`);
}

// ---------------- main ----------------
async function main() {
  if (args[0] === "rollback") {
    const file = args[1];
    if (!file || !fs.existsSync(file)) throw new Error("usage: promote.mjs rollback <promotion-log.json>");
    const log = EJSON.parse(fs.readFileSync(file, "utf8"), { relaxed: false });
    if (log.rolledBackAt) throw new Error(`already rolled back at ${log.rolledBackAt}`);
    if (log.test && !opt("--target-uri")) args.push("--target-uri", log.target, "--target-db", log.db, "--target-images", log.imagesDir);
    if (!log.test) await confirmProd(log.exam);
    const prodT = await openProd(log.exam);
    try {
      await rollbackWith(prodT, log);
      fs.writeFileSync(file, EJSON.stringify(log, undefined, 1, { relaxed: false }));
    } finally {
      await prodT.close();
    }
    return;
  }

  const examKey = args[0];
  if (!EXAMS[examKey]) throw new Error(`usage: promote.mjs <${Object.keys(EXAMS).join("|")}> [--apply]`);
  const devClient = await new MongoClient(DEV_URI, { ...EXACT, serverSelectionTimeoutMS: 5000 }).connect();
  const prodT = await openProd(examKey);
  try {
    console.log(prodT.test
      ? `TARGET: test database ${prodT.db.databaseName} (${opt("--target-uri")}), images ${prodT.imagesDir}`
      : `TARGET: PRODUCTION ${VPS_HOST} database ${prodT.db.databaseName}`);
    const dev = devClient.db(EXAMS[examKey].db);
    let plan, img;
    if (flag("--solutions-only")) {
      console.log("MODE: --solutions-only (clear solutions that are empty in dev; nothing else is written)");
      const s = await buildSolutionsPlan(dev, prodT.db);
      plan = s.plan;
      img = { copy: [], missingLocal: [], solMove: await solutionImagePlan(prodT.db, plan.questions.items, s.prodQ, prodT) };
    } else {
      plan = await buildPlan(dev, prodT.db);
      img = await imagePlan(dev, plan, path.join(DEV_DATA, "images", EXAMS[examKey].imagesFolder), prodT);
    }
    printPlan(examKey, plan, img);
    const goCount = COLLECTIONS.reduce((n, c) => n + plan[c].items.filter((i) => !i.hold).length, 0) + img.copy.length + (img.solMove?.length || 0);
    if (!flag("--apply")) {
      console.log(goCount ? "\nDry run only. Re-run with --apply to promote the GO items." : "\nNothing to promote.");
      return;
    }
    if (!goCount) return console.log("\nNothing to promote.");
    if (!prodT.test) await confirmProd(examKey);
    await apply(examKey, plan, img, prodT);
  } finally {
    await devClient.close();
    await prodT.close();
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

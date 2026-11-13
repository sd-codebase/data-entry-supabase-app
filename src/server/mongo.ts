import "server-only";
import path from "path";
import { MongoClient, Db } from "mongodb";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { EXAMS, currentExamKey } = require("../config/exams.js");

// Local dev MongoDB (scripts/dev-db). Never point this at production.
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27019";
const DEV_DATA = process.env.EMT_DEV_DATA || "/Volumes/DevStorage/code/emt-dev-data";

export const exam = EXAMS[currentExamKey()] as {
  name: string;
  db: string;
  imagesFolder: string;
};

/** Root folder holding this exam's images: <dev data>/images/<exam folder>. */
export const IMAGES_ROOT = path.join(DEV_DATA, "images", exam.imagesFolder);

const g = globalThis as unknown as { _devMongo?: Promise<MongoClient> };

export async function getDb(): Promise<Db> {
  if (!g._devMongo) {
    g._devMongo = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
      .connect()
      .catch((e) => {
        g._devMongo = undefined;
        throw new Error(`Cannot reach dev MongoDB at ${MONGODB_URI}. Run "npm run devdb:up". (${e.message})`);
      });
  }
  return (await g._devMongo).db(exam.db);
}

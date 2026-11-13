// Exam registry shared by next.config.mjs and server code.
// Pick the exam with the EXAM env var (the dev:<exam> npm scripts set it).
const EXAMS = {
  jeemains: { name: "JEE Mains", db: "jee-mains", imagesFolder: "jeemains", port: 3020 },
  neet: { name: "NEET", db: "neet", imagesFolder: "neet", port: 3021 },
  jeeadvanced: { name: "JEE Advanced", db: "jee-advanced", imagesFolder: "jeeadvanced", port: 3022 },
  mpscgs: { name: "MPSC GS", db: "mpsc-gs", imagesFolder: "mpscgs", port: 3023 },
};

function currentExamKey() {
  const key = process.env.EXAM || "mpscgs";
  if (!EXAMS[key]) throw new Error(`Unknown EXAM "${key}". Use one of: ${Object.keys(EXAMS).join(", ")}`);
  return key;
}

module.exports = { EXAMS, currentExamKey };

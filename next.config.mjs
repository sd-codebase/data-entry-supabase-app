import exams from "./src/config/exams.js";

const examKey = exams.currentExamKey();
const exam = exams.EXAMS[examKey];

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@refinedev/antd"],
  output: "standalone",
  // One build folder per exam so several exams can run side by side.
  distDir: `.next-${examKey}`,
  // Client-visible settings derived from EXAM (no per-exam env files needed).
  env: {
    NEXT_PUBLIC_EXAM: examKey,
    NEXT_PUBLIC_APP_NAME: `${exam.name} (dev)`,
    // Images are served by this app from the local dev images folder.
    NEXT_PUBLIC_RESOURCE_BUCKET_URL: "/api/images",
  },
};

export default nextConfig;

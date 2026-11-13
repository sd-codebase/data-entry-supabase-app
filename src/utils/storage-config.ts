// Bucket name kept for the upload API shape; uploads go to the local dev
// images folder regardless (see src/utils/db/client.ts).
function getBucketName(): string {
  const bucketUrl = process.env.NEXT_PUBLIC_RESOURCE_BUCKET_URL || "";
  if (!bucketUrl) return "";
  const parts = bucketUrl.split("/");
  return parts[parts.length - 1] || "";
}

export const STORAGE_BUCKET_NAME = getBucketName();

export function generateUniqueFilename(
  topicNumber: number | undefined,
  questionNumber: number | undefined,
  extension: string = "png"
): string {
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const topicPart = topicNumber ?? "0";
  const questionPart = questionNumber ?? "0";
  return `${topicPart}-${questionPart}-${randomSuffix}.${extension}`;
}

export function getContentType(extension: string): string {
  const types: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
  };
  return types[extension.toLowerCase()] || "image/png";
}

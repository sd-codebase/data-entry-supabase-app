// Serves and stores images in the local dev images folder:
//   GET  /api/images/<resources_directory>/<file>
//   POST /api/images/<resources_directory>/<file>   (raw file body; overwrites)
import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { IMAGES_ROOT } from "@/server/mongo";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".txt": "text/plain",
};

function resolveSafe(parts: string[]): string | null {
  const rel = parts.map(decodeURIComponent).join("/");
  const full = path.resolve(IMAGES_ROOT, rel);
  return full.startsWith(IMAGES_ROOT + path.sep) ? full : null;
}

export async function GET(_req: Request, { params }: { params: { path: string[] } }) {
  const file = resolveSafe(params.path);
  if (!file) return new NextResponse("Bad path", { status: 400 });
  try {
    const data = await fs.readFile(file);
    return new NextResponse(data, {
      headers: {
        "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}

export async function POST(req: Request, { params }: { params: { path: string[] } }) {
  const file = resolveSafe(params.path);
  if (!file) return NextResponse.json({ error: { message: "Bad path" } }, { status: 400 });
  const buf = Buffer.from(await req.arrayBuffer());
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, buf);
  return NextResponse.json({ data: { path: params.path.join("/") }, error: null });
}

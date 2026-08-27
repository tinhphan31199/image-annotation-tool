import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const dynamic = "force-static";

const FILE_MAP: Record<string, string> = {
  "tiktokHuq7wMvtZznXF5WK1YpHbXkykG5CWsKw.txt": "tiktokHuq7wMvtZznXF5WK1YpHbXkykG5CWsKw.txt",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tiktokfile: string }> },
) {
  const { tiktokfile } = await params;
  const target = FILE_MAP[tiktokfile];
  if (!target) {
    return new Response("Not Found", { status: 404 });
  }
  const content = await readFile(join(process.cwd(), "public", target), "utf8");
  return new Response(content, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const dynamic = "force-static";

export async function GET() {
  const content = await readFile(
    join(process.cwd(), "public", "tiktok9sQOrTtxhGq6lhpnAUPFtudV1xk32Kek.txt"),
    "utf8",
  );

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

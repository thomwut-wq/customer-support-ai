import { requireRole } from "@/lib/auth-server";
import { logError } from "@/lib/db";
import { reindexAll } from "@/lib/rag";
import { loadSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const user = await requireRole(req, ["ADMIN", "STAFF"]);
  if (user instanceof Response) return user;
  try {
    return Response.json(await reindexAll(await loadSettings()));
  } catch (e) {
    await logError("reindex", e instanceof Error ? e.message : String(e));
    return Response.json({ error: "สร้างดัชนีไม่สำเร็จ" }, { status: 500 });
  }
}

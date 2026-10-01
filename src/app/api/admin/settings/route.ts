import { resolveEmbeddingConfig } from "@/lib/ai";
import { requireRole } from "@/lib/auth-server";
import { logError } from "@/lib/db";
import { reindexAll } from "@/lib/rag";
import { loadSettings, mergeSettings, saveSettings, toPublicSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  const user = await requireRole(req, ["ADMIN"]);
  if (user instanceof Response) return user;
  return Response.json(toPublicSettings(await loadSettings()));
}

export async function PUT(req: Request) {
  const user = await requireRole(req, ["ADMIN"]);
  if (user instanceof Response) return user;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  try {
    const before = await loadSettings();
    const next = mergeSettings(before, body);
    await saveSettings(next, user.id);
    const prevEmb = resolveEmbeddingConfig(before);
    const nextEmb = resolveEmbeddingConfig(next);
    let reindex = null;
    if (nextEmb && (prevEmb?.id !== nextEmb.id || prevEmb?.apiKey !== nextEmb.apiKey)) {
      reindex = await reindexAll(next);
    }
    return Response.json({ settings: toPublicSettings(await loadSettings()), reindex });
  } catch (e) {
    await logError("settings", e instanceof Error ? e.message : String(e));
    return Response.json({ error: "บันทึกการตั้งค่าไม่สำเร็จ" }, { status: 500 });
  }
}

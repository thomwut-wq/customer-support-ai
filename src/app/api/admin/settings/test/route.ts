import { chatComplete, embedTexts, resolveChatConfig, resolveEmbeddingConfig } from "@/lib/ai";
import { requireRole } from "@/lib/auth-server";
import { logError } from "@/lib/db";
import { loadSettings, mergeSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const maxDuration = 60;

type Check = { ok: boolean; latencyMs?: number; message: string };

export async function POST(req: Request) {
  const user = await requireRole(req, ["ADMIN"]);
  if (user instanceof Response) return user;
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* test saved settings */
  }
  const settings = mergeSettings(await loadSettings(), body);

  const chatCfg = resolveChatConfig(settings);
  let chat: Check;
  if (!chatCfg) {
    chat = { ok: false, message: "ยังไม่ได้กรอก API Key / ข้อมูลที่จำเป็นของผู้ให้บริการนี้" };
  } else {
    const t0 = Date.now();
    try {
      await chatComplete(chatCfg, "You are a health check. Reply with the single word: pong", [{ role: "user", content: "ping" }], 16);
      chat = { ok: true, latencyMs: Date.now() - t0, message: `เชื่อมต่อ ${chatCfg.model} สำเร็จ` };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await logError("test-connection", `chat ${chatCfg.provider}: ${msg}`);
      chat = { ok: false, latencyMs: Date.now() - t0, message: msg };
    }
  }

  const embCfg = resolveEmbeddingConfig(settings);
  let embedding: Check;
  if (!embCfg) {
    embedding = { ok: false, message: "ยังไม่ได้ตั้งค่า Embedding (ต้องมี OpenAI / Gemini / Azure key)" };
  } else {
    const t0 = Date.now();
    try {
      await embedTexts(embCfg, ["ทดสอบการเชื่อมต่อ"], "query");
      embedding = { ok: true, latencyMs: Date.now() - t0, message: `Embedding ${embCfg.model} พร้อมใช้งาน` };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await logError("test-connection", `embedding ${embCfg.provider}: ${msg}`);
      embedding = { ok: false, latencyMs: Date.now() - t0, message: msg };
    }
  }
  return Response.json({ chat, embedding });
}

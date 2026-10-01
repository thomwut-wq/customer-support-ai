import { conversationRateLimit, FALLBACK_MESSAGE, handleChat } from "@/lib/chat";
import { logError } from "@/lib/db";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import type { ChatResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

function rateLimited(conversationId: string | null, seconds: number) {
  const body: ChatResponse = {
    conversationId: conversationId ?? "",
    messageId: null,
    reply: `ใจเย็น ๆ นะคะ คุณส่งข้อความเร็วเกินไป กรุณารอประมาณ ${seconds} วินาที แล้วลองใหม่อีกครั้งค่ะ`,
    status: "rate_limited",
    showEscalate: false,
    sources: [],
  };
  return Response.json(body, { status: 429, headers: { "Retry-After": String(seconds) } });
}

export async function POST(req: Request) {
  let body: { conversationId?: unknown; message?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const conversationId = typeof body.conversationId === "string" ? body.conversationId : null;
  if (!message) return Response.json({ error: "กรุณาพิมพ์ข้อความ" }, { status: 400 });
  if (message.length > 1000) return Response.json({ error: "ข้อความยาวเกินไป (สูงสุด 1,000 ตัวอักษร)" }, { status: 400 });

  const ipWait = checkRateLimit(`chat:${clientIp(req)}`);
  if (ipWait) return rateLimited(conversationId, ipWait);

  try {
    const convWait = await conversationRateLimit(conversationId);
    if (convWait) return rateLimited(conversationId, convWait);
    return Response.json(await handleChat(conversationId, message));
  } catch (e) {
    await logError("chat-route", e instanceof Error ? e.message : String(e));
    const fallback: ChatResponse = {
      conversationId: conversationId ?? "",
      messageId: null,
      reply: FALLBACK_MESSAGE,
      status: "fallback",
      showEscalate: true,
      sources: [],
    };
    return Response.json(fallback);
  }
}

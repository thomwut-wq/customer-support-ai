import { logError, query } from "@/lib/db";
import { T } from "@/lib/tables";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { conversationId?: unknown; messageId?: unknown; value?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const messageId = Number(body.messageId);
  const value = body.value === 1 || body.value === -1 ? body.value : body.value === null ? null : undefined;
  const conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
  if (!Number.isInteger(messageId) || value === undefined || !/^[0-9a-f-]{36}$/i.test(conversationId)) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }
  try {
    const rows = await query(
      `update ${T.messages} set feedback = $3 where id = $1 and conversation_id = $2 and role = 'assistant' returning id`,
      [messageId, conversationId, value]
    );
    if (!rows.length) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ ok: true });
  } catch (e) {
    await logError("feedback", e instanceof Error ? e.message : String(e));
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}

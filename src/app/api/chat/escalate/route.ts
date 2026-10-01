import { logError, query } from "@/lib/db";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { T } from "@/lib/tables";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (checkRateLimit(`escalate:${clientIp(req)}`, 5)) {
    return Response.json({ error: "ส่งคำขอบ่อยเกินไป กรุณารอสักครู่ค่ะ" }, { status: 429 });
  }
  let body: { conversationId?: unknown; name?: unknown; contact?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) : "";
  const contact = typeof body.contact === "string" ? body.contact.trim().slice(0, 150) : "";
  const conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
  if (!name || !contact) return Response.json({ error: "กรุณากรอกชื่อและช่องทางติดต่อ" }, { status: 400 });
  try {
    let id = /^[0-9a-f-]{36}$/i.test(conversationId)
      ? (await query<{ id: string }>(`select id from ${T.conversations} where id = $1`, [conversationId]))[0]?.id
      : undefined;
    if (!id) id = (await query<{ id: string }>(`insert into ${T.conversations} default values returning id`))[0].id;
    await query(
      `update ${T.conversations} set status = 'escalated', visitor_name = $2, contact = $3, last_message_at = now() where id = $1`,
      [id, name, contact]
    );
    return Response.json({ ok: true, conversationId: id });
  } catch (e) {
    await logError("escalate", e instanceof Error ? e.message : String(e));
    return Response.json({ error: "ไม่สามารถส่งคำขอได้ในขณะนี้ กรุณาโทร 02-123-4567" }, { status: 500 });
  }
}

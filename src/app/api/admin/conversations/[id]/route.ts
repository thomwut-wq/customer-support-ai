import { requireRole } from "@/lib/auth-server";
import { logError, query } from "@/lib/db";
import { T } from "@/lib/tables";
import type { Conversation, ConversationStatus, Message } from "@/lib/types";

export const runtime = "nodejs";

const UUID = /^[0-9a-f-]{36}$/i;
const STATUSES: ConversationStatus[] = ["open", "escalated", "resolved"];

export async function GET(req: Request, ctx: RouteContext<"/api/admin/conversations/[id]">) {
  const user = await requireRole(req, ["ADMIN", "STAFF"]);
  if (user instanceof Response) return user;
  const { id } = await ctx.params;
  if (!UUID.test(id)) return Response.json({ error: "ไม่พบบทสนทนา" }, { status: 404 });
  try {
    const [conversation] = await query<Conversation>(`select * from ${T.conversations} where id = $1`, [id]);
    if (!conversation) return Response.json({ error: "ไม่พบบทสนทนา" }, { status: 404 });
    const messages = await query<Message>(`select * from ${T.messages} where conversation_id = $1 order by created_at, id`, [id]);
    return Response.json({ conversation, messages });
  } catch (e) {
    await logError("conversations", e instanceof Error ? e.message : String(e));
    return Response.json({ error: "โหลดบทสนทนาไม่สำเร็จ" }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/admin/conversations/[id]">) {
  const user = await requireRole(req, ["ADMIN", "STAFF"]);
  if (user instanceof Response) return user;
  const { id } = await ctx.params;
  if (!UUID.test(id)) return Response.json({ error: "ไม่พบบทสนทนา" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { status?: string };
  const status = STATUSES.find((s) => s === body.status);
  if (!status) return Response.json({ error: "สถานะไม่ถูกต้อง" }, { status: 422 });
  try {
    const [conversation] = await query<Conversation>(`update ${T.conversations} set status = $2 where id = $1 returning *`, [id, status]);
    if (!conversation) return Response.json({ error: "ไม่พบบทสนทนา" }, { status: 404 });
    return Response.json({ conversation });
  } catch (e) {
    await logError("conversations", e instanceof Error ? e.message : String(e));
    return Response.json({ error: "อัปเดตสถานะไม่สำเร็จ" }, { status: 500 });
  }
}

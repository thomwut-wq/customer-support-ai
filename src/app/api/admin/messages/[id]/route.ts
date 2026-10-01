import { requireRole } from "@/lib/auth-server";
import { logError, query } from "@/lib/db";
import { T } from "@/lib/tables";
import type { Message } from "@/lib/types";

export const runtime = "nodejs";

export async function PATCH(req: Request, ctx: RouteContext<"/api/admin/messages/[id]">) {
  const user = await requireRole(req, ["ADMIN", "STAFF"]);
  if (user instanceof Response) return user;
  const { id } = await ctx.params;
  if (!/^\d+$/.test(id)) return Response.json({ error: "ไม่พบข้อความ" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { flagged?: unknown; flag_note?: unknown };
  if (typeof body.flagged !== "boolean") return Response.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 422 });
  const note = body.flagged && typeof body.flag_note === "string" ? body.flag_note.trim().slice(0, 500) || null : null;
  try {
    const [message] = await query<Message>(
      `update ${T.messages} set flagged = $2, flag_note = $3 where id = $1 and role = 'assistant' returning *`,
      [Number(id), body.flagged, note]
    );
    if (!message) return Response.json({ error: "ไม่พบข้อความ" }, { status: 404 });
    return Response.json({ message });
  } catch (e) {
    await logError("messages", e instanceof Error ? e.message : String(e));
    return Response.json({ error: "บันทึกไม่สำเร็จ" }, { status: 500 });
  }
}

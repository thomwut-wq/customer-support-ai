import { requireRole } from "@/lib/auth-server";
import { logError, query } from "@/lib/db";
import { T } from "@/lib/tables";
import type { Conversation } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await requireRole(req, ["ADMIN", "STAFF"]);
  if (user instanceof Response) return user;
  try {
    const conversations = await query<Conversation & { first_question: string | null; flagged_count: number; unanswered_count: number; negative_count: number }>(
      `select c.*,
        (select m.content from ${T.messages} m where m.conversation_id = c.id and m.role = 'user' order by m.created_at, m.id limit 1) as first_question,
        (select count(*)::int from ${T.messages} m where m.conversation_id = c.id and m.flagged) as flagged_count,
        (select count(*)::int from ${T.messages} m where m.conversation_id = c.id and m.status in ('no_match','low_confidence','fallback')) as unanswered_count,
        (select count(*)::int from ${T.messages} m where m.conversation_id = c.id and m.feedback = -1) as negative_count
       from ${T.conversations} c
       order by c.last_message_at desc
       limit 300`
    );
    return Response.json({ conversations });
  } catch (e) {
    await logError("conversations", e instanceof Error ? e.message : String(e));
    return Response.json({ error: "โหลดบทสนทนาไม่สำเร็จ" }, { status: 500 });
  }
}

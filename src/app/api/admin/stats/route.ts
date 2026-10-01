import { requireRole } from "@/lib/auth-server";
import { logError, query } from "@/lib/db";
import { T } from "@/lib/tables";

export const runtime = "nodejs";

const BKK = `'Asia/Bangkok'`;

export async function GET(req: Request) {
  const user = await requireRole(req, ["ADMIN", "STAFF"]);
  if (user instanceof Response) return user;
  try {
    const [kpi] = await query<{
      today: number;
      yesterday: number;
      answered: number;
      assistant_total: number;
      escalated: number;
      positive: number;
      rated: number;
      total_conversations: number;
    }>(
      `select
        (select count(*)::int from ${T.conversations} where (created_at at time zone ${BKK})::date = (now() at time zone ${BKK})::date) as today,
        (select count(*)::int from ${T.conversations} where (created_at at time zone ${BKK})::date = (now() at time zone ${BKK})::date - 1) as yesterday,
        (select count(*)::int from ${T.messages} where role = 'assistant' and status = 'answered') as answered,
        (select count(*)::int from ${T.messages} where role = 'assistant' and status is not null) as assistant_total,
        (select count(*)::int from ${T.conversations} where status = 'escalated') as escalated,
        (select count(*)::int from ${T.messages} where feedback = 1) as positive,
        (select count(*)::int from ${T.messages} where feedback is not null) as rated,
        (select count(*)::int from ${T.conversations}) as total_conversations`
    );
    const daily = await query<{ day: string; conversations: number; escalated: number }>(
      `with days as (
         select generate_series((now() at time zone ${BKK})::date - 13, (now() at time zone ${BKK})::date, interval '1 day')::date as day
       )
       select to_char(d.day, 'YYYY-MM-DD') as day,
              count(c.id)::int as conversations,
              count(c.id) filter (where c.status = 'escalated')::int as escalated
       from days d
       left join ${T.conversations} c on (c.created_at at time zone ${BKK})::date = d.day
       group by d.day order by d.day`
    );
    const unanswered = await query<{ question: string; count: number; last_at: string; status: string; conversation_id: string; top_similarity: number | null }>(
      `select distinct on (lower(trim(question))) question,
              count(*) over (partition by lower(trim(question)))::int as count,
              max(created_at) over (partition by lower(trim(question))) as last_at,
              status, conversation_id, top_similarity
       from ${T.messages}
       where role = 'assistant' and status in ('no_match', 'low_confidence', 'fallback') and question is not null
       order by lower(trim(question)), created_at desc`
    );
    unanswered.sort((a, b) => b.count - a.count || +new Date(b.last_at) - +new Date(a.last_at));
    return Response.json({ kpi, daily, unanswered: unanswered.slice(0, 8) });
  } catch (e) {
    await logError("stats", e instanceof Error ? e.message : String(e));
    return Response.json({ error: "โหลดข้อมูลแดชบอร์ดไม่สำเร็จ" }, { status: 500 });
  }
}

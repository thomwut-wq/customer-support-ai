import { resolveEmbeddingConfig } from "@/lib/ai";
import { validateArticle } from "@/lib/article-input";
import { requireRole } from "@/lib/auth-server";
import { logError, query } from "@/lib/db";
import { indexArticle } from "@/lib/rag";
import { loadSettings } from "@/lib/settings";
import { T } from "@/lib/tables";
import type { Article } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const user = await requireRole(req, ["ADMIN", "STAFF"]);
  if (user instanceof Response) return user;
  const { value, errors } = validateArticle(await req.json().catch(() => ({})));
  if (!value) return Response.json({ error: "ข้อมูลไม่ถูกต้อง", errors }, { status: 422 });
  try {
    const [article] = await query<Article>(
      `insert into ${T.articles} (title, category, content, is_published, created_by, updated_by)
       values ($1, $2, $3, $4, $5, $5) returning *`,
      [value.title, value.category, value.content, value.is_published, user.id]
    );
    const index = await indexArticle(article, resolveEmbeddingConfig(await loadSettings()));
    const [fresh] = await query<Article>(`select * from ${T.articles} where id = $1`, [article.id]);
    return Response.json({ article: fresh, index });
  } catch (e) {
    await logError("articles", e instanceof Error ? e.message : String(e));
    return Response.json({ error: "บันทึกบทความไม่สำเร็จ" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const user = await requireRole(req, ["ADMIN", "STAFF"]);
  if (user instanceof Response) return user;
  try {
    const articles = await query<Article & { chunk_count: number }>(
      `select a.*, (select count(*)::int from ${T.chunks} c where c.article_id = a.id) as chunk_count
       from ${T.articles} a order by a.updated_at desc`
    );
    return Response.json({ articles });
  } catch (e) {
    await logError("articles", e instanceof Error ? e.message : String(e));
    return Response.json({ error: "โหลดบทความไม่สำเร็จ" }, { status: 500 });
  }
}

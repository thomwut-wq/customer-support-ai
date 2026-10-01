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

const UUID = /^[0-9a-f-]{36}$/i;

export async function PUT(req: Request, ctx: RouteContext<"/api/admin/articles/[id]">) {
  const user = await requireRole(req, ["ADMIN", "STAFF"]);
  if (user instanceof Response) return user;
  const { id } = await ctx.params;
  if (!UUID.test(id)) return Response.json({ error: "Not found" }, { status: 404 });
  const { value, errors } = validateArticle(await req.json().catch(() => ({})));
  if (!value) return Response.json({ error: "ข้อมูลไม่ถูกต้อง", errors }, { status: 422 });
  try {
    const [article] = await query<Article>(
      `update ${T.articles} set title=$2, category=$3, content=$4, is_published=$5, updated_by=$6, updated_at=now()
       where id=$1 returning *`,
      [id, value.title, value.category, value.content, value.is_published, user.id]
    );
    if (!article) return Response.json({ error: "ไม่พบบทความ" }, { status: 404 });
    const index = await indexArticle(article, resolveEmbeddingConfig(await loadSettings()));
    const [fresh] = await query<Article>(`select * from ${T.articles} where id = $1`, [id]);
    return Response.json({ article: fresh, index });
  } catch (e) {
    await logError("articles", e instanceof Error ? e.message : String(e));
    return Response.json({ error: "บันทึกบทความไม่สำเร็จ" }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: RouteContext<"/api/admin/articles/[id]">) {
  const user = await requireRole(req, ["ADMIN", "STAFF"]);
  if (user instanceof Response) return user;
  const { id } = await ctx.params;
  if (!UUID.test(id)) return Response.json({ error: "Not found" }, { status: 404 });
  try {
    const rows = await query(`delete from ${T.articles} where id = $1 returning id`, [id]);
    if (!rows.length) return Response.json({ error: "ไม่พบบทความ" }, { status: 404 });
    return Response.json({ ok: true });
  } catch (e) {
    await logError("articles", e instanceof Error ? e.message : String(e));
    return Response.json({ error: "ลบบทความไม่สำเร็จ" }, { status: 500 });
  }
}

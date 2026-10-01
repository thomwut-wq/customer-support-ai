import "server-only";
import { embedTexts, resolveEmbeddingConfig, toVectorLiteral, type EmbeddingConfig } from "./ai";
import { logError, query } from "./db";
import type { SettingsRow } from "./settings";
import { T } from "./tables";

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 60;

/** Split text into ~500 character chunks, preferring paragraph / sentence / whitespace boundaries. */
export function chunkText(text: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];
  if (clean.length <= size) return [clean];
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + size, clean.length);
    if (end < clean.length) {
      const window = clean.slice(start, end);
      const minBreak = Math.floor(size * 0.5);
      const candidates = [window.lastIndexOf("\n\n"), window.lastIndexOf("\n"), window.lastIndexOf(" "), window.lastIndexOf(". ")];
      const brk = candidates.find((i) => i >= minBreak);
      if (brk !== undefined) end = start + brk + 1;
    }
    const piece = clean.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= clean.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}

type ArticleForIndex = { id: string; title: string; category: string; content: string };

export async function indexArticle(article: ArticleForIndex, cfg: EmbeddingConfig | null): Promise<{ ok: boolean; error?: string }> {
  const pieces = chunkText(article.content);
  if (!cfg) {
    await query(`delete from ${T.chunks} where article_id = $1`, [article.id]);
    await query(`update ${T.articles} set embedding_status='pending', embedding_model=null, embedding_error=$2 where id=$1`, [
      article.id,
      "ยังไม่ได้ตั้งค่า Embedding API",
    ]);
    return { ok: false, error: "No embedding provider configured" };
  }
  try {
    const inputs = pieces.map((p) => `${article.title} (${article.category})\n${p}`);
    const vectors = await embedTexts(cfg, inputs, "document");
    await query(`delete from ${T.chunks} where article_id = $1`, [article.id]);
    for (let i = 0; i < pieces.length; i++) {
      await query(
        `insert into ${T.chunks} (article_id, chunk_index, content, embedding, embedding_model) values ($1, $2, $3, $4::extensions.vector, $5)`,
        [article.id, i, pieces[i], toVectorLiteral(vectors[i]), cfg.id]
      );
    }
    await query(`update ${T.articles} set embedding_status='indexed', embedding_model=$2, embedding_error=null where id=$1`, [article.id, cfg.id]);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logError("embedding", `Article ${article.id}: ${msg}`);
    await query(`update ${T.articles} set embedding_status='failed', embedding_error=$2 where id=$1`, [article.id, msg.slice(0, 500)]);
    return { ok: false, error: msg };
  }
}

export async function reindexAll(settings: SettingsRow): Promise<{ indexed: number; failed: number; total: number; configured: boolean }> {
  const cfg = resolveEmbeddingConfig(settings);
  const articles = await query<ArticleForIndex>(`select id, title, category, content from ${T.articles} order by created_at`);
  let indexed = 0;
  let failed = 0;
  for (const a of articles) {
    const r = await indexArticle(a, cfg);
    if (r.ok) indexed++;
    else failed++;
    if (!cfg) continue;
    if (!r.ok && indexed === 0 && failed >= 2) break;
  }
  return { indexed, failed, total: articles.length, configured: Boolean(cfg) };
}

export type RetrievedChunk = { article_id: string; title: string; category: string; content: string; similarity: number };

export async function retrieve(question: string, cfg: EmbeddingConfig, topK: number): Promise<RetrievedChunk[]> {
  const [vec] = await embedTexts(cfg, [question], "query");
  const rows = await query<RetrievedChunk>(`select * from ${T.matchChunks}($1::extensions.vector, $2, $3)`, [toVectorLiteral(vec), cfg.id, topK]);
  return rows.map((r) => ({ ...r, similarity: Number(r.similarity) }));
}

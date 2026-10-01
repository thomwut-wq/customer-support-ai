import "server-only";
import { chatComplete, resolveChatConfig, resolveEmbeddingConfig, type ChatTurn } from "./ai";
import { logError, query } from "./db";
import { retrieve, type RetrievedChunk } from "./rag";
import { loadSettings } from "./settings";
import { T } from "./tables";
import type { AnswerStatus, ChatResponse, Source } from "./types";

export const FALLBACK_MESSAGE =
  'ขออภัยค่ะ ขณะนี้ผู้ช่วย AI ยังไม่พร้อมให้บริการชั่วคราว กรุณาลองใหม่อีกครั้งในภายหลัง หรือกด "ติดต่อเจ้าหน้าที่" เพื่อให้ทีมงานช่วยเหลือคุณโดยตรงค่ะ (โทร 02-123-4567)';

const NO_MATCH_MESSAGE =
  'ขออภัยค่ะ ฉันยังไม่พบข้อมูลเรื่องนี้ในฐานความรู้ของเรา จึงไม่สามารถตอบได้อย่างถูกต้อง หากต้องการ สามารถกด "ติดต่อเจ้าหน้าที่" เพื่อให้ทีมงานช่วยตอบคำถามนี้ได้เลยค่ะ';

const GREETING_MESSAGE =
  "สวัสดีค่ะ ยินดีต้อนรับสู่ NovaShop ฉันคือผู้ช่วย AI พร้อมตอบคำถามเรื่องการสั่งซื้อ การชำระเงิน การจัดส่ง และการคืนสินค้า มีอะไรให้ช่วยไหมคะ";

const THANKS_MESSAGE = "ยินดีเสมอค่ะ หากมีคำถามเพิ่มเติม ทักมาได้ตลอด 24 ชั่วโมงเลยนะคะ";

const LOW_CONFIDENCE_MARGIN = 0.1;

function smallTalk(text: string): string | null {
  const t = text.trim().toLowerCase().replace(/[!?.~ ]+$/g, "");
  if (/^(สวัสดี(ครับ|ค่ะ|คะ|จ้า|จ้ะ)?|หวัดดี(ครับ|ค่ะ)?|ดีครับ|ดีค่ะ|hello|hi|hey|good (morning|afternoon|evening))$/.test(t)) return GREETING_MESSAGE;
  if (/^(ขอบคุณ(มาก)?(ครับ|ค่ะ|คะ|นะครับ|นะคะ|จ้า)?|ขอบใจ(นะ)?|thank(s| you)( so much)?|ok(ay)? thanks?)$/.test(t)) return THANKS_MESSAGE;
  return null;
}

function buildSystemPrompt(chunks: RetrievedChunk[], lowConfidence: boolean): string {
  const context = chunks
    .map((c, i) => `[${i + 1}] หัวข้อ: ${c.title} (หมวด: ${c.category})\n${c.content}`)
    .join("\n\n---\n\n");
  return [
    "You are the friendly customer-support assistant of NovaShop, a Thai online retailer.",
    "Answer ONLY using the KNOWLEDGE BASE CONTEXT below. Never invent policies, prices, phone numbers, or facts that are not in the context.",
    'If the context does not contain the answer, say politely that you do not have that information and suggest pressing "ติดต่อเจ้าหน้าที่" (contact staff).',
    "Reply in the same language the customer uses (default to Thai). Use a polite, warm tone (Thai female polite particle ค่ะ/คะ). Keep answers concise: 1-4 short sentences or a short numbered list.",
    "Do not mention the words 'context' or 'knowledge base' or cite source numbers.",
    lowConfidence
      ? 'The retrieved context is only a weak match. Ask ONE short clarifying question to understand what the customer needs, briefly mention the closest related topic, and offer "ติดต่อเจ้าหน้าที่" if they prefer to talk to staff.'
      : "",
    "",
    "KNOWLEDGE BASE CONTEXT:",
    context || "(no relevant content)",
  ]
    .filter(Boolean)
    .join("\n");
}

async function ensureConversation(conversationId: string | null): Promise<string> {
  if (conversationId && /^[0-9a-f-]{36}$/i.test(conversationId)) {
    const rows = await query<{ id: string }>(`select id from ${T.conversations} where id = $1`, [conversationId]);
    if (rows[0]) return rows[0].id;
  }
  const rows = await query<{ id: string }>(`insert into ${T.conversations} default values returning id`);
  return rows[0].id;
}

async function recentTurns(conversationId: string): Promise<ChatTurn[]> {
  const rows = await query<{ role: "user" | "assistant"; content: string }>(
    `select role, content from ${T.messages} where conversation_id = $1 order by created_at desc, id desc limit 7`,
    [conversationId]
  );
  return rows.reverse();
}

/** Returns seconds to wait if the conversation is sending too fast, otherwise 0. */
export async function conversationRateLimit(conversationId: string | null): Promise<number> {
  if (!conversationId || !/^[0-9a-f-]{36}$/i.test(conversationId)) return 0;
  const rows = await query<{ n: number }>(
    `select count(*)::int as n from ${T.messages} where conversation_id = $1 and role = 'user' and created_at > now() - interval '60 seconds'`,
    [conversationId]
  );
  return rows[0].n >= 8 ? 30 : 0;
}

export async function handleChat(conversationIdInput: string | null, message: string): Promise<ChatResponse> {
  const conversationId = await ensureConversation(conversationIdInput);
  const history = await recentTurns(conversationId);
  await query(`insert into ${T.messages} (conversation_id, role, content) values ($1, 'user', $2)`, [conversationId, message]);

  let reply: string;
  let status: AnswerStatus | null;
  let sources: Source[] = [];
  let topSimilarity: number | null = null;

  const small = smallTalk(message);
  if (small) {
    reply = small;
    status = null;
  } else {
    const result = await answerWithRag(message, history);
    reply = result.reply;
    status = result.status;
    sources = result.sources;
    topSimilarity = result.topSimilarity;
  }

  const inserted = await query<{ id: number }>(
    `insert into ${T.messages} (conversation_id, role, content, status, question, top_similarity, sources)
     values ($1, 'assistant', $2, $3, $4, $5, $6) returning id`,
    [conversationId, reply, status, message, topSimilarity, JSON.stringify(sources)]
  );
  await query(
    `update ${T.conversations} set message_count = message_count + 2, last_message_at = now() where id = $1`,
    [conversationId]
  );

  return {
    conversationId,
    messageId: Number(inserted[0].id),
    reply,
    status: status ?? "greeting",
    showEscalate: status === "no_match" || status === "low_confidence" || status === "fallback",
    sources,
  };
}

async function answerWithRag(
  message: string,
  history: ChatTurn[]
): Promise<{ reply: string; status: AnswerStatus; sources: Source[]; topSimilarity: number | null }> {
  const fallback = { reply: FALLBACK_MESSAGE, status: "fallback" as const, sources: [], topSimilarity: null };
  try {
    const settings = await loadSettings();
    const chatCfg = resolveChatConfig(settings);
    if (!chatCfg) {
      await logError("chat", `No API key configured for provider "${settings.provider}" — replied with fallback message`);
      return fallback;
    }
    const embCfg = resolveEmbeddingConfig(settings);
    if (!embCfg) {
      await logError("chat", "No embedding provider/key configured — cannot search the knowledge base");
      return fallback;
    }
    const chunks = await retrieve(message, embCfg, settings.top_k);
    const top = chunks[0]?.similarity ?? 0;
    const threshold = settings.match_threshold;
    const strong = chunks.filter((c) => c.similarity >= threshold);
    const weak = chunks.filter((c) => c.similarity >= threshold - LOW_CONFIDENCE_MARGIN);

    if (weak.length === 0) {
      return { reply: NO_MATCH_MESSAGE, status: "no_match", sources: [], topSimilarity: chunks.length ? top : null };
    }
    const lowConfidence = strong.length === 0;
    const used = lowConfidence ? weak.slice(0, 3) : strong;
    const reply = await chatComplete(chatCfg, buildSystemPrompt(used, lowConfidence), [...history, { role: "user", content: message }]);
    const seen = new Set<string>();
    const sources: Source[] = [];
    for (const c of used) {
      if (seen.has(c.article_id)) continue;
      seen.add(c.article_id);
      sources.push({ article_id: c.article_id, title: c.title, similarity: Math.round(c.similarity * 1000) / 1000 });
    }
    return { reply, status: lowConfidence ? "low_confidence" : "answered", sources, topSimilarity: top };
  } catch (e) {
    await logError("chat", e instanceof Error ? e.message : String(e));
    return fallback;
  }
}

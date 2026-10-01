import "server-only";
import type { SettingsRow } from "./settings";
import type { ProviderId } from "./types";

export const EMBEDDING_DIMENSIONS = 1536;
const TIMEOUT_MS = 30_000;

export type ChatTurn = { role: "user" | "assistant"; content: string };

export class ProviderError extends Error {}

export type ChatConfig = { provider: ProviderId; apiKey: string; model: string; endpoint?: string; apiVersion?: string };
export type EmbeddingConfig = { provider: "openai" | "gemini" | "azure"; apiKey: string; model: string; endpoint?: string; apiVersion?: string; id: string };

export function resolveChatConfig(s: SettingsRow): ChatConfig | null {
  switch (s.provider) {
    case "openai":
      return s.openai_api_key ? { provider: "openai", apiKey: s.openai_api_key, model: s.openai_model } : null;
    case "anthropic":
      return s.anthropic_api_key ? { provider: "anthropic", apiKey: s.anthropic_api_key, model: s.anthropic_model } : null;
    case "gemini":
      return s.gemini_api_key ? { provider: "gemini", apiKey: s.gemini_api_key, model: s.gemini_model } : null;
    case "azure":
      return s.azure_api_key && s.azure_endpoint && s.azure_deployment
        ? { provider: "azure", apiKey: s.azure_api_key, model: s.azure_deployment, endpoint: s.azure_endpoint, apiVersion: s.azure_api_version }
        : null;
  }
}

export function resolveEmbeddingConfig(s: SettingsRow): EmbeddingConfig | null {
  let p = s.embedding_provider;
  if (p === "auto") {
    if (s.provider === "anthropic") p = s.openai_api_key || !s.gemini_api_key ? "openai" : "gemini";
    else p = s.provider;
  }
  if (p === "openai") {
    const key = s.embedding_api_key || s.openai_api_key;
    return key ? { provider: "openai", apiKey: key, model: "text-embedding-3-small", id: "openai:text-embedding-3-small" } : null;
  }
  if (p === "gemini") {
    const key = s.embedding_api_key || s.gemini_api_key;
    return key ? { provider: "gemini", apiKey: key, model: "gemini-embedding-001", id: "gemini:gemini-embedding-001" } : null;
  }
  const key = s.embedding_api_key || s.azure_api_key;
  if (!key || !s.azure_endpoint || !s.azure_embedding_deployment) return null;
  return {
    provider: "azure",
    apiKey: key,
    model: s.azure_embedding_deployment,
    endpoint: s.azure_endpoint,
    apiVersion: s.azure_api_version,
    id: `azure:${s.azure_embedding_deployment}`,
  };
}

async function postJson(url: string, headers: Record<string, string>, body: unknown): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    throw new ProviderError(`Network error: ${e instanceof Error ? e.message : String(e)}`);
  }
  const text = await res.text();
  if (!res.ok) {
    let detail = text.slice(0, 300);
    try {
      const j = JSON.parse(text) as { error?: { message?: string } | string };
      if (typeof j.error === "string") detail = j.error;
      else if (j.error?.message) detail = j.error.message;
    } catch {
      /* keep raw text */
    }
    throw new ProviderError(`HTTP ${res.status}: ${detail}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new ProviderError("Invalid JSON response from provider");
  }
}

function azureUrl(endpoint: string, deployment: string, op: string, apiVersion?: string) {
  return `${endpoint.replace(/\/+$/, "")}/openai/deployments/${encodeURIComponent(deployment)}/${op}?api-version=${encodeURIComponent(apiVersion || "2024-10-21")}`;
}

type OpenAIChatResponse = { choices?: { message?: { content?: string } }[] };
type AnthropicResponse = { content?: { type: string; text?: string }[] };
type GeminiResponse = { candidates?: { content?: { parts?: { text?: string }[] } }[] };

export async function chatComplete(cfg: ChatConfig, system: string, turns: ChatTurn[], maxTokens = 700): Promise<string> {
  let text: string | undefined;
  if (cfg.provider === "openai" || cfg.provider === "azure") {
    const messages = [{ role: "system", content: system }, ...turns];
    const body = { messages, temperature: 0.2, max_tokens: maxTokens };
    const json = (cfg.provider === "openai"
      ? await postJson("https://api.openai.com/v1/chat/completions", { Authorization: `Bearer ${cfg.apiKey}` }, { ...body, model: cfg.model })
      : await postJson(azureUrl(cfg.endpoint!, cfg.model, "chat/completions", cfg.apiVersion), { "api-key": cfg.apiKey }, body)) as OpenAIChatResponse;
    text = json.choices?.[0]?.message?.content;
  } else if (cfg.provider === "anthropic") {
    const json = (await postJson(
      "https://api.anthropic.com/v1/messages",
      { "x-api-key": cfg.apiKey, "anthropic-version": "2023-06-01" },
      { model: cfg.model, system, messages: turns, max_tokens: maxTokens, temperature: 0.2 }
    )) as AnthropicResponse;
    text = json.content?.filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
  } else {
    const json = (await postJson(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent`,
      { "x-goog-api-key": cfg.apiKey },
      {
        systemInstruction: { parts: [{ text: system }] },
        contents: turns.map((t) => ({ role: t.role === "assistant" ? "model" : "user", parts: [{ text: t.content }] })),
        generationConfig: { temperature: 0.2, maxOutputTokens: maxTokens },
      }
    )) as GeminiResponse;
    text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("");
  }
  if (!text || !text.trim()) throw new ProviderError("Provider returned an empty response");
  return text.trim();
}

type OpenAIEmbeddingResponse = { data?: { index: number; embedding: number[] }[] };
type GeminiBatchEmbeddingResponse = { embeddings?: { values: number[] }[] };

export async function embedTexts(cfg: EmbeddingConfig, texts: string[], kind: "document" | "query"): Promise<number[][]> {
  if (texts.length === 0) return [];
  let vectors: number[][] = [];
  if (cfg.provider === "openai" || cfg.provider === "azure") {
    const json = (cfg.provider === "openai"
      ? await postJson("https://api.openai.com/v1/embeddings", { Authorization: `Bearer ${cfg.apiKey}` }, { model: cfg.model, input: texts })
      : await postJson(azureUrl(cfg.endpoint!, cfg.model, "embeddings", cfg.apiVersion), { "api-key": cfg.apiKey }, { input: texts })) as OpenAIEmbeddingResponse;
    vectors = (json.data ?? []).sort((a, b) => a.index - b.index).map((d) => d.embedding);
  } else {
    const json = (await postJson(
      `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:batchEmbedContents`,
      { "x-goog-api-key": cfg.apiKey },
      {
        requests: texts.map((t) => ({
          model: `models/${cfg.model}`,
          content: { parts: [{ text: t }] },
          taskType: kind === "query" ? "RETRIEVAL_QUERY" : "RETRIEVAL_DOCUMENT",
          outputDimensionality: EMBEDDING_DIMENSIONS,
        })),
      }
    )) as GeminiBatchEmbeddingResponse;
    vectors = (json.embeddings ?? []).map((e) => e.values);
  }
  if (vectors.length !== texts.length) throw new ProviderError("Embedding count mismatch");
  for (const v of vectors) {
    if (v.length !== EMBEDDING_DIMENSIONS) {
      throw new ProviderError(`Embedding model must return ${EMBEDDING_DIMENSIONS} dimensions (got ${v.length})`);
    }
  }
  return vectors;
}

export function toVectorLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}

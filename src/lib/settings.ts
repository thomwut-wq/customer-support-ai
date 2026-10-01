import "server-only";
import { query } from "./db";
import { T } from "./tables";
import type { EmbeddingProviderId, KeyField, ProviderId, PublicSettings } from "./types";

export type SettingsRow = {
  provider: ProviderId;
  openai_api_key: string | null;
  openai_model: string;
  anthropic_api_key: string | null;
  anthropic_model: string;
  gemini_api_key: string | null;
  gemini_model: string;
  azure_api_key: string | null;
  azure_endpoint: string | null;
  azure_api_version: string;
  azure_deployment: string | null;
  azure_embedding_deployment: string | null;
  embedding_provider: EmbeddingProviderId;
  embedding_api_key: string | null;
  match_threshold: number;
  top_k: number;
  updated_at: string;
};

export const KEY_FIELDS: KeyField[] = ["openai_api_key", "anthropic_api_key", "gemini_api_key", "azure_api_key", "embedding_api_key"];

export const TEXT_FIELDS = [
  "openai_model",
  "anthropic_model",
  "gemini_model",
  "azure_endpoint",
  "azure_api_version",
  "azure_deployment",
  "azure_embedding_deployment",
] as const;

export async function loadSettings(): Promise<SettingsRow> {
  const rows = await query<SettingsRow>(`select * from ${T.settings} where id = 1`);
  if (rows[0]) return { ...rows[0], match_threshold: Number(rows[0].match_threshold), top_k: Number(rows[0].top_k) };
  await query(`insert into ${T.settings} (id) values (1) on conflict (id) do nothing`);
  return loadSettings();
}

export function maskKey(key: string | null): string | null {
  if (!key) return null;
  const last4 = key.slice(-4);
  if (key.length > 12) return `••••${key.slice(0, 3)}...${last4}`;
  return `••••${last4}`;
}

export function toPublicSettings(s: SettingsRow): PublicSettings {
  const keys = Object.fromEntries(KEY_FIELDS.map((k) => [k, { set: Boolean(s[k]), masked: maskKey(s[k]) }])) as PublicSettings["keys"];
  return {
    provider: s.provider,
    openai_model: s.openai_model,
    anthropic_model: s.anthropic_model,
    gemini_model: s.gemini_model,
    azure_endpoint: s.azure_endpoint,
    azure_api_version: s.azure_api_version,
    azure_deployment: s.azure_deployment,
    azure_embedding_deployment: s.azure_embedding_deployment,
    embedding_provider: s.embedding_provider,
    match_threshold: s.match_threshold,
    top_k: s.top_k,
    updated_at: s.updated_at,
    keys,
  };
}

const PROVIDERS: ProviderId[] = ["openai", "anthropic", "gemini", "azure"];
const EMBEDDING_PROVIDERS: EmbeddingProviderId[] = ["auto", "openai", "gemini", "azure"];

/** Merge an untrusted client payload over saved settings. Keys are only replaced when a new value is supplied. */
export function mergeSettings(base: SettingsRow, body: Record<string, unknown>): SettingsRow {
  const next: SettingsRow = { ...base };
  if (typeof body.provider === "string" && PROVIDERS.includes(body.provider as ProviderId)) next.provider = body.provider as ProviderId;
  if (typeof body.embedding_provider === "string" && EMBEDDING_PROVIDERS.includes(body.embedding_provider as EmbeddingProviderId)) {
    next.embedding_provider = body.embedding_provider as EmbeddingProviderId;
  }
  for (const f of TEXT_FIELDS) {
    const v = body[f];
    if (typeof v === "string") {
      const trimmed = v.trim().slice(0, 500);
      if (f === "azure_endpoint" || f === "azure_deployment" || f === "azure_embedding_deployment") next[f] = trimmed || null;
      else if (trimmed) next[f] = trimmed;
    }
  }
  for (const k of KEY_FIELDS) {
    const v = body[k];
    if (typeof v === "string" && v.trim()) next[k] = v.trim();
    if (body[`clear_${k}`] === true) next[k] = null;
  }
  const th = Number(body.match_threshold);
  if (Number.isFinite(th) && th >= 0 && th <= 1) next.match_threshold = th;
  const k = Number(body.top_k);
  if (Number.isInteger(k) && k >= 1 && k <= 20) next.top_k = k;
  return next;
}

export async function saveSettings(s: SettingsRow, userId: string): Promise<void> {
  await query(
    `update ${T.settings} set provider=$1, openai_api_key=$2, openai_model=$3, anthropic_api_key=$4, anthropic_model=$5,
       gemini_api_key=$6, gemini_model=$7, azure_api_key=$8, azure_endpoint=$9, azure_api_version=$10, azure_deployment=$11,
       azure_embedding_deployment=$12, embedding_provider=$13, embedding_api_key=$14, match_threshold=$15, top_k=$16,
       updated_by=$17, updated_at=now()
     where id = 1`,
    [
      s.provider, s.openai_api_key, s.openai_model, s.anthropic_api_key, s.anthropic_model,
      s.gemini_api_key, s.gemini_model, s.azure_api_key, s.azure_endpoint, s.azure_api_version, s.azure_deployment,
      s.azure_embedding_deployment, s.embedding_provider, s.embedding_api_key, s.match_threshold, s.top_k, userId,
    ]
  );
}

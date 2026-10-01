export type Role = "ADMIN" | "STAFF";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
};

export type Article = {
  id: string;
  title: string;
  category: string;
  content: string;
  is_published: boolean;
  embedding_status: "pending" | "indexed" | "failed";
  embedding_model: string | null;
  embedding_error: string | null;
  created_at: string;
  updated_at: string;
};

export type ConversationStatus = "open" | "escalated" | "resolved";

export type Conversation = {
  id: string;
  visitor_name: string | null;
  contact: string | null;
  status: ConversationStatus;
  message_count: number;
  created_at: string;
  last_message_at: string;
};

export type AnswerStatus = "answered" | "low_confidence" | "no_match" | "fallback";

export type Source = { article_id: string; title: string; similarity: number };

export type Message = {
  id: number;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  status: AnswerStatus | null;
  question: string | null;
  top_similarity: number | null;
  sources: Source[];
  feedback: -1 | 1 | null;
  flagged: boolean;
  flag_note: string | null;
  created_at: string;
};

export type ProviderId = "openai" | "anthropic" | "gemini" | "azure";
export type EmbeddingProviderId = "auto" | "openai" | "gemini" | "azure";

export type KeyField = "openai_api_key" | "anthropic_api_key" | "gemini_api_key" | "azure_api_key" | "embedding_api_key";

export type PublicSettings = {
  provider: ProviderId;
  openai_model: string;
  anthropic_model: string;
  gemini_model: string;
  azure_endpoint: string | null;
  azure_api_version: string;
  azure_deployment: string | null;
  azure_embedding_deployment: string | null;
  embedding_provider: EmbeddingProviderId;
  match_threshold: number;
  top_k: number;
  updated_at: string;
  keys: Record<KeyField, { set: boolean; masked: string | null }>;
};

export type ChatResponse = {
  conversationId: string;
  messageId: number | null;
  reply: string;
  status: AnswerStatus | "greeting" | "rate_limited";
  showEscalate: boolean;
  sources: Source[];
};

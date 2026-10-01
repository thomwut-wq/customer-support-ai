const P = "customer_support_ai_l3md_";

export const T = {
  profiles: `${P}profiles`,
  articles: `${P}articles`,
  chunks: `${P}chunks`,
  conversations: `${P}conversations`,
  messages: `${P}messages`,
  settings: `${P}settings`,
  errorLogs: `${P}error_logs`,
  matchChunks: `${P}match_chunks`,
} as const;

export const AUTH_EMAIL_DOMAIN = process.env.NEXT_PUBLIC_AUTH_EMAIL_DOMAIN || "csai.local";

export function toLoginEmail(identifier: string): string {
  const v = identifier.trim().toLowerCase();
  return v.includes("@") ? v : `${v}@${AUTH_EMAIL_DOMAIN}`;
}

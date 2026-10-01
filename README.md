# Customer Support AI

ผู้ช่วยตอบคำถามลูกค้าด้วย AI (RAG) — public customer chat widget backed by a company knowledge base, plus an admin/staff console for managing articles, reviewing conversations and configuring the LLM provider.

## Features

- **Public customer site** — marketing landing page with a floating chat widget (no login). Typing indicator, streaming-like reveal, quick suggestion chips, source citations, thumbs up/down feedback, "ติดต่อเจ้าหน้าที่" escalation form and friendly rate-limit messages.
- **RAG knowledge base** — articles are chunked (~500 chars) and embedded on save, stored in a `pgvector` column, and retrieved by cosine similarity (threshold 0.7, top 5). The bot answers only from retrieved content; low-similarity matches trigger a clarifying question / staff hand-off.
- **AI Settings (ADMIN)** — choose OpenAI, Anthropic (Claude), Google Gemini or Azure OpenAI at runtime; per-provider API key (masked), model / deployment, Azure endpoint + API version, separate embedding provider/key, and a Test Connection button. Keys live only in a server-side table.
- **Graceful fallback** — when no key is configured or the provider fails, the bot replies with a polite canned message and the error is logged to `customer_support_ai_l3md_error_logs`.
- **Admin console** — dashboard (KPI count-up cards, 14-day Recharts bar chart, unanswered-question list), conversations (transcripts, status, flag bad answers), knowledge base CRUD (search, category badges, edit modal, delete confirmation, re-index).
- **Roles** — `ADMIN` (full access) and `STAFF` (conversations + knowledge base). Every user can change their own password from the avatar menu. Extra users are created in the Supabase dashboard (then add a row to `customer_support_ai_l3md_profiles`).
- Thai-first bilingual UI, Asia/Bangkok timestamps, Noto Sans Thai + Inter.

## Tech stack

Next.js (App Router) · TypeScript · Tailwind CSS v4 · Supabase Postgres + pgvector · Supabase Auth · Recharts · lucide-react · sonner

All AI provider calls and vector search run only in server route handlers (`src/app/api/**`); the browser never receives API keys.

## Environment variables

| Name | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | Supabase anon key (auth + RLS) |
| `SUPABASE_DB_URL` | server only | Postgres connection string for server routes and setup |

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the values above
SEED_ADMIN_PASSWORD=... SEED_STAFF_PASSWORD=... node scripts/setup-db.mjs   # schema, RLS, pgvector, seed data, users
npm run dev
```

`scripts/setup-db.mjs` is idempotent: it applies `supabase/schema.sql`, creates the admin and staff auth users (email-confirmed) if missing and seeds sample articles and conversations only when the tables are empty.

Open `/` for the customer site and `/login` for the console. After signing in as admin, go to **ตั้งค่า AI** to add a provider key, then click **สร้างดัชนีใหม่** on the knowledge base page to embed the seeded articles.

## Database

All tables are prefixed `customer_support_ai_l3md_` (profiles, articles, chunks, conversations, messages, settings, error_logs). RLS is enabled on every table with role-based policies; the settings table is not readable by the anon/authenticated roles at all.

## Deploy

Deployed on Vercel — set the three environment variables above on the project and deploy from the GitHub repository.

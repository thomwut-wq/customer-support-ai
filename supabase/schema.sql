-- Customer Support AI — schema (all tables prefixed customer_support_ai_l3md_)
create extension if not exists vector with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- Profiles / roles -----------------------------------------------------------
create table if not exists public.customer_support_ai_l3md_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'STAFF' check (role in ('ADMIN','STAFF')),
  created_at timestamptz not null default now()
);

create or replace function public.customer_support_ai_l3md_current_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.customer_support_ai_l3md_profiles where id = auth.uid()
$$;

-- Knowledge base -------------------------------------------------------------
create table if not exists public.customer_support_ai_l3md_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  content text not null,
  is_published boolean not null default true,
  embedding_status text not null default 'pending' check (embedding_status in ('pending','indexed','failed')),
  embedding_model text,
  embedding_error text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_support_ai_l3md_chunks (
  id bigserial primary key,
  article_id uuid not null references public.customer_support_ai_l3md_articles(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding extensions.vector(1536),
  embedding_model text,
  created_at timestamptz not null default now()
);
create index if not exists customer_support_ai_l3md_chunks_article_idx on public.customer_support_ai_l3md_chunks(article_id);
create index if not exists customer_support_ai_l3md_chunks_embedding_idx
  on public.customer_support_ai_l3md_chunks using hnsw (embedding extensions.vector_cosine_ops);

-- Conversations --------------------------------------------------------------
create table if not exists public.customer_support_ai_l3md_conversations (
  id uuid primary key default gen_random_uuid(),
  visitor_name text,
  contact text,
  status text not null default 'open' check (status in ('open','escalated','resolved')),
  message_count int not null default 0,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
create index if not exists customer_support_ai_l3md_conversations_created_idx on public.customer_support_ai_l3md_conversations(created_at desc);

create table if not exists public.customer_support_ai_l3md_messages (
  id bigserial primary key,
  conversation_id uuid not null references public.customer_support_ai_l3md_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  status text check (status in ('answered','low_confidence','no_match','fallback')),
  question text,
  top_similarity real,
  sources jsonb not null default '[]'::jsonb,
  feedback smallint check (feedback in (-1, 1)),
  flagged boolean not null default false,
  flag_note text,
  created_at timestamptz not null default now()
);
create index if not exists customer_support_ai_l3md_messages_conv_idx on public.customer_support_ai_l3md_messages(conversation_id, created_at);
create index if not exists customer_support_ai_l3md_messages_created_idx on public.customer_support_ai_l3md_messages(created_at desc);

-- AI provider settings (server-only) -----------------------------------------
create table if not exists public.customer_support_ai_l3md_settings (
  id int primary key default 1 check (id = 1),
  provider text not null default 'openai' check (provider in ('openai','anthropic','gemini','azure')),
  openai_api_key text,
  openai_model text not null default 'gpt-4o-mini',
  anthropic_api_key text,
  anthropic_model text not null default 'claude-sonnet-4-5',
  gemini_api_key text,
  gemini_model text not null default 'gemini-2.0-flash',
  azure_api_key text,
  azure_endpoint text,
  azure_api_version text not null default '2024-10-21',
  azure_deployment text,
  azure_embedding_deployment text,
  embedding_provider text not null default 'auto' check (embedding_provider in ('auto','openai','gemini','azure')),
  embedding_api_key text,
  match_threshold real not null default 0.7,
  top_k int not null default 5,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.customer_support_ai_l3md_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.customer_support_ai_l3md_error_logs (
  id bigserial primary key,
  source text not null,
  message text not null,
  created_at timestamptz not null default now()
);

-- Vector search ---------------------------------------------------------------
create or replace function public.customer_support_ai_l3md_match_chunks(
  query_embedding extensions.vector(1536),
  match_model text,
  match_count int default 5
)
returns table (article_id uuid, title text, category text, content text, similarity double precision)
language sql stable set search_path = public, extensions as $$
  select c.article_id, a.title, a.category, c.content,
         1 - (c.embedding <=> query_embedding) as similarity
  from public.customer_support_ai_l3md_chunks c
  join public.customer_support_ai_l3md_articles a on a.id = c.article_id
  where c.embedding is not null and c.embedding_model = match_model and a.is_published
  order by c.embedding <=> query_embedding
  limit match_count
$$;
revoke execute on function public.customer_support_ai_l3md_match_chunks(extensions.vector, text, int) from public, anon, authenticated;

-- Row Level Security ----------------------------------------------------------
alter table public.customer_support_ai_l3md_profiles enable row level security;
alter table public.customer_support_ai_l3md_articles enable row level security;
alter table public.customer_support_ai_l3md_chunks enable row level security;
alter table public.customer_support_ai_l3md_conversations enable row level security;
alter table public.customer_support_ai_l3md_messages enable row level security;
alter table public.customer_support_ai_l3md_settings enable row level security;
alter table public.customer_support_ai_l3md_error_logs enable row level security;

drop policy if exists "profiles_select_self_or_admin" on public.customer_support_ai_l3md_profiles;
create policy "profiles_select_self_or_admin" on public.customer_support_ai_l3md_profiles
  for select to authenticated
  using (id = auth.uid() or public.customer_support_ai_l3md_current_role() = 'ADMIN');

drop policy if exists "articles_staff_all" on public.customer_support_ai_l3md_articles;
create policy "articles_staff_all" on public.customer_support_ai_l3md_articles
  for all to authenticated
  using (public.customer_support_ai_l3md_current_role() in ('ADMIN','STAFF'))
  with check (public.customer_support_ai_l3md_current_role() in ('ADMIN','STAFF'));

drop policy if exists "chunks_staff_select" on public.customer_support_ai_l3md_chunks;
create policy "chunks_staff_select" on public.customer_support_ai_l3md_chunks
  for select to authenticated
  using (public.customer_support_ai_l3md_current_role() in ('ADMIN','STAFF'));

drop policy if exists "conversations_staff_select" on public.customer_support_ai_l3md_conversations;
create policy "conversations_staff_select" on public.customer_support_ai_l3md_conversations
  for select to authenticated
  using (public.customer_support_ai_l3md_current_role() in ('ADMIN','STAFF'));
drop policy if exists "conversations_staff_update" on public.customer_support_ai_l3md_conversations;
create policy "conversations_staff_update" on public.customer_support_ai_l3md_conversations
  for update to authenticated
  using (public.customer_support_ai_l3md_current_role() in ('ADMIN','STAFF'))
  with check (public.customer_support_ai_l3md_current_role() in ('ADMIN','STAFF'));

drop policy if exists "messages_staff_select" on public.customer_support_ai_l3md_messages;
create policy "messages_staff_select" on public.customer_support_ai_l3md_messages
  for select to authenticated
  using (public.customer_support_ai_l3md_current_role() in ('ADMIN','STAFF'));
drop policy if exists "messages_staff_update" on public.customer_support_ai_l3md_messages;
create policy "messages_staff_update" on public.customer_support_ai_l3md_messages
  for update to authenticated
  using (public.customer_support_ai_l3md_current_role() in ('ADMIN','STAFF'))
  with check (public.customer_support_ai_l3md_current_role() in ('ADMIN','STAFF'));

-- Settings hold provider API keys: no client access at all (server routes use a direct DB connection).
drop policy if exists "settings_no_client_access" on public.customer_support_ai_l3md_settings;
create policy "settings_no_client_access" on public.customer_support_ai_l3md_settings
  for all to anon, authenticated using (false) with check (false);

drop policy if exists "error_logs_admin_select" on public.customer_support_ai_l3md_error_logs;
create policy "error_logs_admin_select" on public.customer_support_ai_l3md_error_logs
  for select to authenticated
  using (public.customer_support_ai_l3md_current_role() = 'ADMIN');

grant select on public.customer_support_ai_l3md_profiles to authenticated;
grant select, insert, update, delete on public.customer_support_ai_l3md_articles to authenticated;
grant select on public.customer_support_ai_l3md_chunks to authenticated;
grant select, update on public.customer_support_ai_l3md_conversations to authenticated;
grant select, update on public.customer_support_ai_l3md_messages to authenticated;
grant select on public.customer_support_ai_l3md_error_logs to authenticated;
revoke all on public.customer_support_ai_l3md_settings from anon, authenticated;

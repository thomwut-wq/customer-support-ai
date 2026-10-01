// Usage: SUPABASE_DB_URL=... SEED_ADMIN_PASSWORD=... SEED_STAFF_PASSWORD=... node scripts/setup-db.mjs
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { articles, conversations } from './seed-data.mjs';

const P = 'customer_support_ai_l3md_';
const DOMAIN = process.env.AUTH_EMAIL_DOMAIN || 'csai.local';
const url = process.env.SUPABASE_DB_URL;
if (!url) throw new Error('SUPABASE_DB_URL is required');

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

const schema = fs.readFileSync(path.join(import.meta.dirname, '..', 'supabase', 'schema.sql'), 'utf8');
await client.query(schema);
console.log('Schema applied');

async function ensureUser(username, password, role, fullName) {
  const email = `${username}@${DOMAIN}`;
  const existing = await client.query('select id from auth.users where email = $1', [email]);
  let id = existing.rows[0]?.id;
  if (!id) {
    if (!password) { console.log(`Skip creating ${email}: no password provided`); return; }
    const r = await client.query(
      `insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
         raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
         confirmation_token, recovery_token, email_change_token_new, email_change)
       values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', $1,
         extensions.crypt($2, extensions.gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', $3::text), now(), now(), '', '', '', '')
       returning id`,
      [email, password, fullName]
    );
    id = r.rows[0].id;
    console.log(`Created auth user ${email}`);
  }
  await client.query(
    `insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
     select gen_random_uuid(), $1::uuid, $1::text, jsonb_build_object('sub', $1::text, 'email', $2::text, 'email_verified', true), 'email', now(), now(), now()
     where not exists (select 1 from auth.identities where user_id = $1::uuid and provider = 'email')`,
    [id, email]
  );
  await client.query(
    `insert into ${P}profiles (id, email, full_name, role) values ($1, $2, $3, $4)
     on conflict (id) do update set role = excluded.role, full_name = coalesce(${P}profiles.full_name, excluded.full_name)`,
    [id, email, fullName, role]
  );
}

await ensureUser('admin', process.env.SEED_ADMIN_PASSWORD, 'ADMIN', 'ผู้ดูแลระบบ');
await ensureUser('staff', process.env.SEED_STAFF_PASSWORD, 'STAFF', 'เจ้าหน้าที่ซัพพอร์ต');

const { rows: [{ count: articleCount }] } = await client.query(`select count(*)::int as count from ${P}articles`);
const articleIds = [];
if (articleCount === 0) {
  for (const a of articles) {
    const r = await client.query(
      `insert into ${P}articles (title, category, content, created_at, updated_at)
       values ($1, $2, $3, now() - interval '20 days', now() - interval '20 days') returning id`,
      [a.title, a.category, a.content]
    );
    articleIds.push(r.rows[0].id);
  }
  console.log(`Seeded ${articles.length} articles`);
} else {
  console.log('Articles already present — skipping article seed');
}

const { rows: [{ count: convCount }] } = await client.query(`select count(*)::int as count from ${P}conversations`);
if (convCount === 0 && articleIds.length) {
  for (const c of conversations) {
    const { rows: [{ ts }] } = await client.query(
      `select least(
         ((date_trunc('day', now() at time zone 'Asia/Bangkok') - make_interval(days => $1) + make_interval(hours => $2)) at time zone 'Asia/Bangkok'),
         now() - interval '30 minutes') as ts`,
      [c.daysAgo, c.hour]
    );
    const start = new Date(ts);
    const conv = await client.query(
      `insert into ${P}conversations (visitor_name, contact, status, message_count, created_at, last_message_at)
       values ($1, $2, $3, $4, $5, $5) returning id`,
      [c.visitor_name ?? null, c.contact ?? null, c.status, c.messages.length, start]
    );
    const convId = conv.rows[0].id;
    let lastQuestion = null;
    let t = start.getTime();
    for (const m of c.messages) {
      t += m.role === 'user' ? 40_000 : 4_000;
      const sources = m.source !== undefined && m.status === 'answered'
        ? [{ article_id: articleIds[m.source], title: articles[m.source].title, similarity: m.sim }]
        : [];
      await client.query(
        `insert into ${P}messages (conversation_id, role, content, status, question, top_similarity, sources, feedback, flagged, flag_note, created_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [convId, m.role, m.content, m.status ?? null, m.role === 'assistant' ? lastQuestion : null,
         m.sim ?? null, JSON.stringify(sources), m.feedback ?? null, m.flagged ?? false, m.flag_note ?? null, new Date(t)]
      );
      if (m.role === 'user') lastQuestion = m.content;
    }
    await client.query(`update ${P}conversations set last_message_at = $2 where id = $1`, [convId, new Date(t)]);
  }
  console.log(`Seeded ${conversations.length} conversations`);
}

await client.end();
console.log('Done');

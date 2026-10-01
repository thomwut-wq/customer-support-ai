import "server-only";
import { Pool, type QueryResultRow } from "pg";

const globalForPg = globalThis as unknown as { __csaiPool?: Pool };

function getPool(): Pool {
  if (!globalForPg.__csaiPool) {
    const connectionString = process.env.SUPABASE_DB_URL;
    if (!connectionString) throw new Error("SUPABASE_DB_URL is not configured");
    globalForPg.__csaiPool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return globalForPg.__csaiPool;
}

export async function query<R extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<R[]> {
  const res = await getPool().query<R>(text, params);
  return res.rows;
}

export async function logError(source: string, message: string): Promise<void> {
  console.error(`[${source}] ${message}`);
  try {
    await query(`insert into customer_support_ai_l3md_error_logs (source, message) values ($1, $2)`, [source, message.slice(0, 2000)]);
  } catch (e) {
    console.error("failed to persist error log", e);
  }
}

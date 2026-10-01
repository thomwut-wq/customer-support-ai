import "server-only";
import { createClient } from "@supabase/supabase-js";
import { query } from "./db";
import { T } from "./tables";
import type { Role } from "./types";

export type AuthedUser = { id: string; email: string; role: Role };

export async function getAuthedUser(req: Request): Promise<AuthedUser | null> {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  const rows = await query<{ role: Role; email: string }>(`select role, email from ${T.profiles} where id = $1`, [data.user.id]);
  if (!rows[0]) return null;
  return { id: data.user.id, email: rows[0].email, role: rows[0].role };
}

export async function requireRole(req: Request, roles: Role[]): Promise<AuthedUser | Response> {
  const user = await getAuthedUser(req);
  if (!user) return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  if (!roles.includes(user.role)) return Response.json({ error: "คุณไม่มีสิทธิ์ดำเนินการนี้" }, { status: 403 });
  return user;
}

"use client";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { getSupabase } from "@/lib/supabase-browser";
import { T } from "@/lib/tables";
import type { Profile } from "@/lib/types";

type AuthState = { profile: Profile | null; loading: boolean; signOut: () => Promise<void> };

const AuthContext = createContext<AuthState>({ profile: null, loading: true, signOut: async () => {} });

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      router.replace("/login");
      return;
    }
    const { data: p, error } = await supabase.from(T.profiles).select("id, email, full_name, role").eq("id", data.session.user.id).maybeSingle();
    if (error || !p) {
      await supabase.auth.signOut();
      toast.error("บัญชีนี้ไม่มีสิทธิ์เข้าถึงระบบหลังบ้าน");
      router.replace("/login");
      return;
    }
    setProfile(p as Profile);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const id = requestAnimationFrame(() => void load());
    const { data: sub } = getSupabase().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.replace("/login");
    });
    return () => {
      cancelAnimationFrame(id);
      sub.subscription.unsubscribe();
    };
  }, [load, router]);

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
    toast.success("ออกจากระบบเรียบร้อย");
  }, []);

  return <AuthContext.Provider value={{ profile, loading, signOut }}>{children}</AuthContext.Provider>;
}

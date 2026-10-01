"use client";
import { ArrowLeft, Eye, EyeOff, Loader2, LockKeyhole, MessageSquareText, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { getSupabase } from "@/lib/supabase-browser";
import { T, toLoginEmail } from "@/lib/tables";
import { cn } from "@/lib/format";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string; form?: string }>({});
  const idRef = useRef<HTMLInputElement>(null);
  const pwRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getSupabase()
      .auth.getSession()
      .then(({ data }) => {
        if (data.session) router.replace("/admin");
      });
  }, [router]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!identifier.trim()) errs.identifier = "กรุณากรอกชื่อผู้ใช้หรืออีเมล";
    if (!password) errs.password = "กรุณากรอกรหัสผ่าน";
    setErrors(errs);
    if (errs.identifier) return idRef.current?.focus();
    if (errs.password) return pwRef.current?.focus();
    setLoading(true);
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({ email: toLoginEmail(identifier), password });
    if (error || !data.user) {
      setLoading(false);
      setErrors({ form: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
      pwRef.current?.focus();
      return;
    }
    const { data: profile } = await supabase.from(T.profiles).select("role").eq("id", data.user.id).maybeSingle();
    if (!profile) {
      await supabase.auth.signOut();
      setLoading(false);
      setErrors({ form: "บัญชีนี้ไม่มีสิทธิ์เข้าถึงระบบหลังบ้าน" });
      return;
    }
    toast.success("เข้าสู่ระบบสำเร็จ");
    router.replace("/admin");
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-slate-50 px-4 py-10">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-200/60 via-violet-200/50 to-sky-200/50 blur-3xl" aria-hidden />
      <div className="relative w-full max-w-md animate-fade-in-up">
        <Link href="/" className="mb-6 inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-slate-500 transition-colors duration-150 hover:bg-white hover:text-slate-800">
          <ArrowLeft className="size-4" aria-hidden /> กลับหน้าหลัก
        </Link>
        <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-8 shadow-xl shadow-slate-200/60 backdrop-blur">
          <div className="flex flex-col items-center text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-lg shadow-indigo-500/30">
              <MessageSquareText className="size-7" aria-hidden />
            </span>
            <h1 className="mt-5 text-2xl font-bold text-slate-900">เข้าสู่ระบบหลังบ้าน</h1>
            <p className="mt-0.5 text-xs text-slate-400">Admin & Staff Console Sign in</p>
          </div>

          <form onSubmit={submit} noValidate className="mt-8 space-y-5">
            {errors.form && (
              <div role="alert" className="animate-fade-in rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {errors.form}
              </div>
            )}
            <div className="space-y-1.5">
              <label htmlFor="identifier" className="block cursor-pointer text-sm font-medium text-slate-700">
                ชื่อผู้ใช้หรืออีเมล
              </label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
                <input
                  id="identifier"
                  ref={idRef}
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  aria-invalid={!!errors.identifier}
                  className={cn(
                    "block w-full rounded-xl border bg-white py-3 pr-3 pl-10 text-sm shadow-sm transition-colors duration-150 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none",
                    errors.identifier ? "border-rose-400" : "border-slate-200 hover:border-slate-300 focus:border-indigo-500"
                  )}
                />
              </div>
              {errors.identifier && <p className="text-xs font-medium text-rose-600">{errors.identifier}</p>}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="block cursor-pointer text-sm font-medium text-slate-700">
                รหัสผ่าน
              </label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
                <input
                  id="password"
                  ref={pwRef}
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!errors.password}
                  className={cn(
                    "block w-full rounded-xl border bg-white py-3 pr-11 pl-10 text-sm shadow-sm transition-colors duration-150 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none",
                    errors.password ? "border-rose-400" : "border-slate-200 hover:border-slate-300 focus:border-indigo-500"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs font-medium text-rose-600">{errors.password}</p>}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 font-medium text-white shadow-lg shadow-indigo-600/25 transition-colors duration-150 hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
              เข้าสู่ระบบ
            </button>
          </form>
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">สำหรับผู้ดูแลระบบและเจ้าหน้าที่ซัพพอร์ตเท่านั้น</p>
      </div>
    </div>
  );
}

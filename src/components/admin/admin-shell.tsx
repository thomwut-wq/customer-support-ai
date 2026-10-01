"use client";
import {
  BookOpen,
  Bot,
  ChevronDown,
  ExternalLink,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  MessagesSquare,
  PanelLeftClose,
  PanelLeftOpen,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/format";
import { Skeleton } from "../ui/misc";
import { useAuth } from "./auth-provider";
import { ChangePasswordModal } from "./change-password-modal";

const NAV = [
  { href: "/admin", th: "แดชบอร์ด", en: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "STAFF"] },
  { href: "/admin/conversations", th: "บทสนทนา", en: "Conversations", icon: MessagesSquare, roles: ["ADMIN", "STAFF"] },
  { href: "/admin/knowledge", th: "ฐานความรู้", en: "Knowledge Base", icon: BookOpen, roles: ["ADMIN", "STAFF"] },
  { href: "/admin/settings", th: "ตั้งค่า AI", en: "AI Settings", icon: Bot, roles: ["ADMIN"] },
] as const;

function initials(name: string | null, email: string) {
  const src = (name || email).trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (Array.from(parts[0])[0] + Array.from(parts[1])[0]).toUpperCase();
  return Array.from(src)[0]?.toUpperCase() ?? "U";
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { profile, loading, signOut } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setCollapsed(localStorage.getItem("csai-sidebar") === "1"));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMobileOpen(false));
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      localStorage.setItem("csai-sidebar", c ? "0" : "1");
      return !c;
    });
  };

  if (loading || !profile) {
    return (
      <div className="flex min-h-dvh bg-slate-50">
        <div className="hidden w-64 border-r border-slate-200 bg-white p-4 lg:block">
          <Skeleton className="h-10 w-40" />
          <div className="mt-8 space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
        <div className="flex-1 p-8">
          <Skeleton className="h-8 w-56" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const items = NAV.filter((n) => (n.roles as readonly string[]).includes(profile.role));
  const current = items.find((n) => (n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href)));

  const sidebar = (isMobile: boolean) => (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-16 items-center gap-2.5 border-b border-slate-100 px-4", collapsed && !isMobile && "justify-center px-2")}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-md shadow-indigo-500/30">
          <MessageSquareText className="size-5" aria-hidden />
        </span>
        {(!collapsed || isMobile) && (
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-sm font-bold text-slate-900">Customer Support AI</span>
            <span className="block truncate text-[11px] text-slate-400">คอนโซลผู้ดูแล · Console</span>
          </span>
        )}
        {isMobile && (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="ปิดเมนู"
            className="ml-auto flex size-9 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors duration-150 hover:bg-slate-100"
          >
            <X className="size-5" />
          </button>
        )}
      </div>
      <nav className="flex-1 space-y-1 p-3" aria-label="เมนูหลัก">
        {items.map((n) => {
          const active = current?.href === n.href;
          return (
            <Link
              key={n.href}
              href={n.href}
              title={collapsed && !isMobile ? `${n.th} · ${n.en}` : undefined}
              className={cn(
                "group flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none",
                active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                collapsed && !isMobile && "justify-center px-0"
              )}
            >
              <n.icon className={cn("size-5 shrink-0", active ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600")} aria-hidden />
              {(!collapsed || isMobile) && (
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate">{n.th}</span>
                  <span className={cn("truncate text-[11px] font-normal", active ? "text-indigo-400" : "text-slate-400")}>{n.en}</span>
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-100 p-3">
        <Link
          href="/"
          target="_blank"
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-500 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900",
            collapsed && !isMobile && "justify-center px-0"
          )}
          title="ดูหน้าเว็บลูกค้า"
        >
          <ExternalLink className="size-4 shrink-0" aria-hidden />
          {(!collapsed || isMobile) && (
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate">ดูหน้าเว็บลูกค้า</span>
              <span className="truncate text-[11px] text-slate-400">Customer site</span>
            </span>
          )}
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-dvh bg-slate-50">
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 border-r border-slate-200 bg-white transition-[width] duration-200 lg:block",
          collapsed ? "w-[76px]" : "w-64"
        )}
      >
        {sidebar(false)}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-slate-900/40" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="relative h-full w-72 animate-fade-in-up bg-white shadow-2xl">{sidebar(true)}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="เปิดเมนู"
            className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
          >
            <Menu className="size-5" />
          </button>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "ขยายแถบเมนู" : "ย่อแถบเมนู"}
            className="hidden size-9 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none lg:flex"
          >
            {collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800">{current?.th ?? "คอนโซล"}</p>
            <p className="truncate text-[11px] text-slate-400">{current?.en ?? "Console"}</p>
          </div>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="เมนูโปรไฟล์"
              className="flex cursor-pointer items-center gap-2 rounded-full p-1 pr-2 transition-colors duration-150 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-semibold text-white shadow-sm ring-2 ring-white">
                {initials(profile.full_name, profile.email)}
              </span>
              <ChevronDown className={cn("size-4 text-slate-400 transition-transform duration-150", menuOpen && "rotate-180")} aria-hidden />
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 mt-2 w-64 animate-scale-in overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
                <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                    <UserRound className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{profile.full_name || "ผู้ใช้งาน"}</p>
                    <span
                      className={cn(
                        "mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                        profile.role === "ADMIN" ? "bg-indigo-50 text-indigo-700 ring-indigo-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                      )}
                    >
                      {profile.role === "ADMIN" ? "ผู้ดูแลระบบ · Admin" : "เจ้าหน้าที่ · Staff"}
                    </span>
                  </div>
                </div>
                <div className="p-1.5">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setPwOpen(true);
                    }}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 transition-colors duration-150 hover:bg-slate-100"
                  >
                    <KeyRound className="size-4 text-slate-400" aria-hidden />
                    <span className="flex flex-col leading-tight">
                      เปลี่ยนรหัสผ่าน <span className="text-[11px] text-slate-400">Change password</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      void signOut();
                    }}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-rose-600 transition-colors duration-150 hover:bg-rose-50"
                  >
                    <LogOut className="size-4" aria-hidden />
                    <span className="flex flex-col leading-tight">
                      ออกจากระบบ <span className="text-[11px] text-rose-300">Sign out</span>
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>

      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} email={profile.email} />
    </div>
  );
}

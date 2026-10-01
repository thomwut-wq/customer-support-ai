"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn, formatNumber } from "@/lib/format";

export function BiLabel({ th, en, className, enClassName }: { th: ReactNode; en: ReactNode; className?: string; enClassName?: string }) {
  return (
    <span className={cn("flex min-w-0 flex-col leading-tight", className)}>
      <span className="truncate">{th}</span>
      <span className={cn("truncate text-xs font-normal text-slate-400", enClassName)}>{en}</span>
    </span>
  );
}

export function PageHeader({ th, en, description, actions }: { th: string; en: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex animate-fade-in-up flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{th}</h1>
        <p className="mt-0.5 text-xs text-slate-400">{en}</p>
        {description && <p className="mt-2 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const tones = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  rose: "bg-rose-50 text-rose-700 ring-rose-200",
  sky: "bg-sky-50 text-sky-700 ring-sky-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  teal: "bg-teal-50 text-teal-700 ring-teal-200",
  orange: "bg-orange-50 text-orange-700 ring-orange-200",
  pink: "bg-pink-50 text-pink-700 ring-pink-200",
} as const;
export type Tone = keyof typeof tones;

export function Badge({ tone = "slate", children, className, dot }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset", tones[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

const categoryTones: Tone[] = ["indigo", "emerald", "amber", "sky", "violet", "teal", "orange", "pink", "rose"];
export function categoryTone(category: string): Tone {
  let h = 0;
  for (const ch of category) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return categoryTones[h % categoryTones.length];
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-md", className)} aria-hidden />;
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/50", className)}>{children}</div>;
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex animate-fade-in flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-slate-100 text-indigo-500 ring-1 ring-indigo-100">
        {icon}
      </div>
      <p className="font-semibold text-slate-800">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function CountUp({ value, decimals = 0, suffix = "", duration = 900 }: { value: number; decimals?: number; suffix?: string; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = fromRef.current;
    if (reduce) {
      fromRef.current = value;
      const id = requestAnimationFrame(() => setDisplay(value));
      return () => cancelAnimationFrame(id);
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (value - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  const text = decimals ? display.toFixed(decimals) : formatNumber(Math.round(display));
  return (
    <span className="tabular-nums">
      {text}
      {suffix}
    </span>
  );
}

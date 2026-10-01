"use client";
import { AlertTriangle, CheckCircle2, ChevronRight, HelpCircle, MessagesSquare, PhoneForwarded, RefreshCw, Smile } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge, Card, CountUp, EmptyState, PageHeader, Skeleton } from "@/components/ui/misc";
import { formatNumber, relativeTime, shortDay } from "@/lib/format";
import { authFetch } from "@/lib/supabase-browser";

type Stats = {
  kpi: { today: number; yesterday: number; answered: number; assistant_total: number; escalated: number; positive: number; rated: number; total_conversations: number };
  daily: { day: string; conversations: number; escalated: number }[];
  unanswered: { question: string; count: number; last_at: string; status: string; conversation_id: string; top_similarity: number | null }[];
};

const statusLabel: Record<string, { th: string; tone: "rose" | "amber" | "slate" }> = {
  no_match: { th: "ไม่พบในฐานความรู้", tone: "rose" },
  low_confidence: { th: "ความมั่นใจต่ำ", tone: "amber" },
  fallback: { th: "AI ไม่พร้อม", tone: "slate" },
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const res = await authFetch("/api/admin/stats");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "โหลดข้อมูลไม่สำเร็จ");
      setStats(data);
      if (manual) toast.success("อัปเดตข้อมูลล่าสุดแล้ว");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => void load());
    return () => cancelAnimationFrame(id);
  }, [load]);

  const k = stats?.kpi;
  const answerRate = k && k.assistant_total ? (k.answered / k.assistant_total) * 100 : 0;
  const satisfaction = k && k.rated ? (k.positive / k.rated) * 100 : 0;
  const todayDelta = k ? k.today - k.yesterday : 0;

  const cards = [
    {
      th: "บทสนทนาวันนี้",
      en: "Conversations today",
      icon: MessagesSquare,
      tone: "from-indigo-500 to-indigo-600",
      value: k?.today ?? 0,
      foot: k ? `${todayDelta >= 0 ? "+" : ""}${formatNumber(todayDelta)} จากเมื่อวาน · ทั้งหมด ${formatNumber(k.total_conversations)}` : "",
    },
    {
      th: "คำถามที่ตอบได้",
      en: "Answered questions",
      icon: CheckCircle2,
      tone: "from-emerald-500 to-emerald-600",
      value: k?.answered ?? 0,
      foot: k ? `อัตราตอบได้ ${answerRate.toFixed(0)}% จาก ${formatNumber(k.assistant_total)} คำถาม` : "",
    },
    {
      th: "ต้องติดต่อเจ้าหน้าที่",
      en: "Needs staff follow-up",
      icon: PhoneForwarded,
      tone: "from-amber-500 to-orange-500",
      value: k?.escalated ?? 0,
      foot: "บทสนทนาที่รอเจ้าหน้าที่ติดต่อกลับ",
    },
    {
      th: "ความพึงพอใจ",
      en: "Satisfaction (CSAT)",
      icon: Smile,
      tone: "from-violet-500 to-fuchsia-500",
      value: satisfaction,
      suffix: "%",
      decimals: 0,
      foot: k ? `จากการให้คะแนน ${formatNumber(k.rated)} ครั้ง` : "",
    },
  ];

  const chartData = (stats?.daily ?? []).map((d) => ({ ...d, label: shortDay(`${d.day}T12:00:00+07:00`) }));

  return (
    <div className="space-y-6">
      <PageHeader
        th="แดชบอร์ด"
        en="Dashboard overview"
        description="ภาพรวมการทำงานของผู้ช่วย AI และช่องว่างของฐานความรู้"
        actions={
          <Button variant="secondary" onClick={() => load(true)} loading={refreshing} icon={<RefreshCw className="size-4" />}>
            รีเฟรช
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c, i) => (
          <Card key={c.th} className="animate-fade-in-up p-5 transition-shadow duration-200 hover:shadow-md" >
            <div style={{ animationDelay: `${i * 70}ms` }} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-600">{c.th}</p>
                <p className="truncate text-xs text-slate-400">{c.en}</p>
              </div>
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${c.tone} text-white shadow-md`}>
                <c.icon className="size-5" aria-hidden />
              </span>
            </div>
            {stats ? (
              <>
                <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
                  <CountUp value={c.value} suffix={c.suffix} decimals={c.decimals} />
                </p>
                <p className="mt-1 truncate text-xs text-slate-500">{c.foot}</p>
              </>
            ) : (
              <>
                <Skeleton className="mt-4 h-8 w-20" />
                <Skeleton className="mt-2 h-3 w-36" />
              </>
            )}
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card className="animate-fade-in-up p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900">จำนวนบทสนทนารายวัน</h2>
              <p className="text-xs text-slate-400">Conversations per day · last 14 days (Asia/Bangkok)</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-indigo-500" /> ทั้งหมด
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-amber-400" /> ส่งต่อเจ้าหน้าที่
              </span>
            </div>
          </div>
          <div className="mt-6 h-72">
            {stats ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <Tooltip
                    cursor={{ fill: "#eef2ff" }}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 10px 25px -10px rgba(15,23,42,.2)", fontSize: 12 }}
                    formatter={(v, name) => [formatNumber(Number(v)), name === "conversations" ? "บทสนทนา" : "ส่งต่อเจ้าหน้าที่"]}
                  />
                  <Bar dataKey="conversations" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="escalated" fill="#fbbf24" radius={[6, 6, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-end gap-2">
                {Array.from({ length: 14 }).map((_, i) => (
                  <Skeleton key={i} className="flex-1 rounded-t-md" />
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card className="flex animate-fade-in-up flex-col p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-semibold text-slate-900">
                <AlertTriangle className="size-4 text-amber-500" aria-hidden /> คำถามที่ยังตอบไม่ได้
              </h2>
              <p className="text-xs text-slate-400">Unanswered questions — knowledge gaps</p>
            </div>
            <Link href="/admin/knowledge" className="cursor-pointer rounded-lg px-2 py-1 text-xs font-medium text-indigo-600 transition-colors duration-150 hover:bg-indigo-50">
              เพิ่มบทความ
            </Link>
          </div>
          <div className="mt-4 flex-1">
            {!stats ? (
              <div className="space-y-3">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            ) : stats.unanswered.length === 0 ? (
              <EmptyState icon={<HelpCircle className="size-6" />} title="ยอดเยี่ยม! ไม่มีคำถามค้าง" description="ผู้ช่วย AI ตอบได้ทุกคำถามจากฐานความรู้" />
            ) : (
              <ul className="space-y-2">
                {stats.unanswered.map((u) => {
                  const s = statusLabel[u.status] ?? statusLabel.no_match;
                  return (
                    <li key={u.question}>
                      <Link
                        href={`/admin/conversations?id=${u.conversation_id}`}
                        className="group flex cursor-pointer items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5 transition-colors duration-150 hover:border-indigo-100 hover:bg-indigo-50/50"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600 tabular-nums group-hover:bg-white">
                          {u.count}×
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-800">{u.question}</span>
                          <span className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                            <Badge tone={s.tone}>{s.th}</Badge>
                            {relativeTime(u.last_at)}
                          </span>
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-slate-300 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-indigo-500" aria-hidden />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

"use client";
import { ArrowLeft, Bot, CheckCircle2, Flag, FlagOff, MessagesSquare, PhoneForwarded, Search, ThumbsDown, ThumbsUp, UserRound } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Badge, Card, EmptyState, PageHeader, Skeleton, type Tone } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { cn, formatDateTime, formatTime, relativeTime } from "@/lib/format";
import { authFetch } from "@/lib/supabase-browser";
import type { Conversation, ConversationStatus, Message } from "@/lib/types";

type Row = Conversation & { first_question: string | null; flagged_count: number; unanswered_count: number; negative_count: number };

const STATUS: Record<ConversationStatus, { th: string; en: string; tone: Tone }> = {
  open: { th: "เปิดอยู่", en: "Open", tone: "sky" },
  escalated: { th: "รอเจ้าหน้าที่", en: "Escalated", tone: "amber" },
  resolved: { th: "แก้ไขแล้ว", en: "Resolved", tone: "emerald" },
};

const ANSWER: Record<string, { th: string; tone: Tone }> = {
  answered: { th: "ตอบจากฐานความรู้", tone: "emerald" },
  low_confidence: { th: "ความมั่นใจต่ำ", tone: "amber" },
  no_match: { th: "ไม่พบข้อมูล", tone: "rose" },
  fallback: { th: "AI ไม่พร้อม", tone: "slate" },
};

function ConversationsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const selectedId = params.get("id");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | ConversationStatus | "flagged">("all");

  const loadList = useCallback(async () => {
    try {
      const res = await authFetch("/api/admin/conversations");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRows(data.conversations);
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "โหลดบทสนทนาไม่สำเร็จ");
      setRows([]);
    }
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => void loadList());
    return () => cancelAnimationFrame(id);
  }, [loadList]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (rows ?? []).filter((r) => {
      if (filter === "flagged" && r.flagged_count === 0) return false;
      if (filter !== "all" && filter !== "flagged" && r.status !== filter) return false;
      if (!term) return true;
      return [r.first_question, r.visitor_name, r.contact].some((v) => v?.toLowerCase().includes(term));
    });
  }, [rows, q, filter]);

  const select = (id: string | null) => router.replace(id ? `/admin/conversations?id=${id}` : "/admin/conversations", { scroll: false });

  return (
    <div className="space-y-6">
      <PageHeader th="บทสนทนา" en="Conversations" description="อ่านบทสนทนาทั้งหมดระหว่างลูกค้ากับผู้ช่วย AI และทำเครื่องหมายคำตอบที่ไม่ถูกต้อง" />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <Card className={cn("flex min-h-0 animate-fade-in-up flex-col overflow-hidden lg:h-[calc(100dvh-220px)]", selectedId && "hidden lg:flex")}>
          <div className="space-y-3 border-b border-slate-100 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <label htmlFor="conv-search" className="sr-only">
                ค้นหาบทสนทนา
              </label>
              <Input id="conv-search" type="search" placeholder="ค้นหาคำถาม ชื่อ หรือช่องทางติดต่อ..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="กรองสถานะ">
              {(
                [
                  ["all", "ทั้งหมด"],
                  ["open", STATUS.open.th],
                  ["escalated", STATUS.escalated.th],
                  ["resolved", STATUS.resolved.th],
                  ["flagged", "ถูกทำเครื่องหมาย"],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setFilter(v)}
                  aria-pressed={filter === v}
                  className={cn(
                    "cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none",
                    filter === v ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
            {!rows ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState icon={<MessagesSquare className="size-6" />} title="ไม่พบบทสนทนา" description="ลองเปลี่ยนคำค้นหาหรือตัวกรอง" />
            ) : (
              <ul className="divide-y divide-slate-100">
                {filtered.map((r, i) => {
                  const s = STATUS[r.status];
                  const active = r.id === selectedId;
                  return (
                    <li key={r.id} className="animate-fade-in-up" style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}>
                      <button
                        type="button"
                        onClick={() => select(r.id)}
                        aria-current={active || undefined}
                        className={cn(
                          "flex w-full cursor-pointer flex-col gap-1.5 px-4 py-3.5 text-left transition-colors duration-150 focus-visible:bg-indigo-50 focus-visible:outline-none",
                          active ? "bg-indigo-50/80 shadow-[inset_3px_0_0_#4f46e5]" : "hover:bg-slate-50"
                        )}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                              <UserRound className="size-3.5" aria-hidden />
                            </span>
                            <span className="truncate text-sm font-medium text-slate-800">{r.visitor_name || "ลูกค้าทั่วไป"}</span>
                          </span>
                          <span className="shrink-0 text-xs text-slate-400">{relativeTime(r.last_message_at)}</span>
                        </span>
                        <span className="line-clamp-2 text-sm text-slate-600">{r.first_question || "—"}</span>
                        <span className="flex flex-wrap items-center gap-1.5">
                          <Badge tone={s.tone} dot>
                            {s.th}
                          </Badge>
                          <span className="text-xs text-slate-400 tabular-nums">{r.message_count} ข้อความ</span>
                          {r.unanswered_count > 0 && <Badge tone="rose">ตอบไม่ได้ {r.unanswered_count}</Badge>}
                          {r.flagged_count > 0 && (
                            <Badge tone="orange">
                              <Flag className="size-3" aria-hidden /> {r.flagged_count}
                            </Badge>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>

        <div className={cn("min-w-0", !selectedId && "hidden lg:block")}>
          {selectedId ? (
            <Transcript key={selectedId} id={selectedId} onBack={() => select(null)} onChanged={loadList} />
          ) : (
            <Card className="flex h-full min-h-80 items-center justify-center lg:h-[calc(100dvh-220px)]">
              <EmptyState icon={<MessagesSquare className="size-6" />} title="เลือกบทสนทนาเพื่ออ่านรายละเอียด" description="คลิกรายการทางซ้ายเพื่อดูบทสนทนาฉบับเต็ม" />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Transcript({ id, onBack, onChanged }: { id: string; onBack: () => void; onChanged: () => void }) {
  const [conv, setConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [flagTarget, setFlagTarget] = useState<Message | null>(null);

  useEffect(() => {
    let cancelled = false;
    authFetch(`/api/admin/conversations/${id}`)
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error);
        setConv(data.conversation);
        setMessages(data.messages);
      })
      .catch((e) => !cancelled && setError(e instanceof Error && e.message ? e.message : "โหลดบทสนทนาไม่สำเร็จ"));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const changeStatus = async (status: ConversationStatus) => {
    setStatusSaving(true);
    const res = await authFetch(`/api/admin/conversations/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    const data = await res.json().catch(() => ({}));
    setStatusSaving(false);
    if (!res.ok) return toast.error(data.error || "อัปเดตสถานะไม่สำเร็จ");
    setConv(data.conversation);
    toast.success(`เปลี่ยนสถานะเป็น “${STATUS[status].th}” แล้ว`);
    onChanged();
  };

  const unflag = async (m: Message) => {
    const res = await authFetch(`/api/admin/messages/${m.id}`, { method: "PATCH", body: JSON.stringify({ flagged: false }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(data.error || "บันทึกไม่สำเร็จ");
    setMessages((ms) => ms?.map((x) => (x.id === m.id ? data.message : x)) ?? null);
    toast.success("ยกเลิกการทำเครื่องหมายแล้ว");
    onChanged();
  };

  if (error) {
    return (
      <Card className="p-6">
        <EmptyState icon={<MessagesSquare className="size-6" />} title={error} action={<Button variant="secondary" onClick={onBack}>กลับไปที่รายการ</Button>} />
      </Card>
    );
  }

  return (
    <Card className="flex animate-fade-in-up flex-col overflow-hidden lg:h-[calc(100dvh-220px)]">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
        <Button variant="ghost" size="sm" onClick={onBack} icon={<ArrowLeft className="size-4" />} className="lg:hidden">
          กลับ
        </Button>
        {conv ? (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-900">{conv.visitor_name || "ลูกค้าทั่วไป"}</p>
              <p className="truncate text-xs text-slate-400">
                เริ่ม {formatDateTime(conv.created_at)}
                {conv.contact ? ` · ติดต่อ: ${conv.contact}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="conv-status" className="sr-only">
                สถานะบทสนทนา
              </label>
              <Select id="conv-status" value={conv.status} disabled={statusSaving} onChange={(e) => changeStatus(e.target.value as ConversationStatus)} className="h-10 w-44 py-2">
                {(Object.keys(STATUS) as ConversationStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS[s].th} · {STATUS[s].en}
                  </option>
                ))}
              </Select>
              {conv.status !== "resolved" && (
                <Button size="sm" variant="outline" onClick={() => changeStatus("resolved")} loading={statusSaving} icon={<CheckCircle2 className="size-4" />}>
                  ปิดเรื่อง
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
        )}
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50/50 px-4 py-5 sm:px-6">
        {!messages ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className={cn("h-16 rounded-2xl", i % 2 ? "mr-auto w-2/3" : "ml-auto w-1/2")} />)
        ) : messages.length === 0 ? (
          <EmptyState icon={<MessagesSquare className="size-6" />} title="ยังไม่มีข้อความ" />
        ) : (
          messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="flex animate-fade-in-up justify-end">
                <div className="max-w-[80%]">
                  <p className="rounded-2xl rounded-br-md bg-indigo-600 px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-white shadow-sm">{m.content}</p>
                  <p className="mt-1 text-right text-[11px] text-slate-400">{formatTime(m.created_at)}</p>
                </div>
              </div>
            ) : (
              <div key={m.id} className="flex animate-fade-in-up gap-2.5">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                  <Bot className="size-4" aria-hidden />
                </span>
                <div className="max-w-[85%] min-w-0">
                  <div className={cn("rounded-2xl rounded-bl-md border bg-white px-4 py-2.5 shadow-sm", m.flagged ? "border-orange-300 ring-2 ring-orange-100" : "border-slate-200")}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-700">{m.content}</p>
                    {m.sources?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2">
                        {m.sources.map((s) => (
                          <span key={s.article_id} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                            {s.title} · {(s.similarity * 100).toFixed(0)}%
                          </span>
                        ))}
                      </div>
                    )}
                    {m.flagged && m.flag_note && (
                      <p className="mt-2 rounded-lg bg-orange-50 px-2.5 py-1.5 text-xs text-orange-800">
                        <Flag className="mr-1 inline size-3" aria-hidden />
                        {m.flag_note}
                      </p>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                    <span>{formatTime(m.created_at)}</span>
                    {m.status && <Badge tone={ANSWER[m.status]?.tone ?? "slate"}>{ANSWER[m.status]?.th ?? m.status}</Badge>}
                    {m.top_similarity != null && <span className="tabular-nums">ความใกล้เคียง {(m.top_similarity * 100).toFixed(0)}%</span>}
                    {m.feedback === 1 && <ThumbsUp className="size-3.5 text-emerald-500" aria-label="ลูกค้าพอใจ" />}
                    {m.feedback === -1 && <ThumbsDown className="size-3.5 text-rose-500" aria-label="ลูกค้าไม่พอใจ" />}
                    {m.flagged ? (
                      <button
                        type="button"
                        onClick={() => unflag(m)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-orange-600 transition-colors duration-150 hover:bg-orange-50"
                      >
                        <FlagOff className="size-3" aria-hidden /> ยกเลิกเครื่องหมาย
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setFlagTarget(m)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-slate-500 transition-colors duration-150 hover:bg-slate-100 hover:text-orange-600"
                      >
                        <Flag className="size-3" aria-hidden /> ทำเครื่องหมายคำตอบไม่ดี
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          )
        )}
        {conv?.status === "escalated" && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <PhoneForwarded className="size-4 shrink-0" aria-hidden /> ลูกค้าขอให้เจ้าหน้าที่ติดต่อกลับ{conv.contact ? ` ที่ ${conv.contact}` : ""}
          </div>
        )}
      </div>

      <FlagModal
        message={flagTarget}
        onClose={() => setFlagTarget(null)}
        onSaved={(m) => {
          setMessages((ms) => ms?.map((x) => (x.id === m.id ? m : x)) ?? null);
          setFlagTarget(null);
          onChanged();
        }}
      />
    </Card>
  );
}

function FlagModal({ message, onClose, onSaved }: { message: Message | null; onClose: () => void; onSaved: (m: Message) => void }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const close = () => {
    setNote("");
    onClose();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message) return;
    setSaving(true);
    const res = await authFetch(`/api/admin/messages/${message.id}`, { method: "PATCH", body: JSON.stringify({ flagged: true, flag_note: note }) });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return toast.error(data.error || "บันทึกไม่สำเร็จ");
    toast.success("ทำเครื่องหมายคำตอบนี้แล้ว");
    setNote("");
    onSaved(data.message);
  };

  return (
    <Modal
      open={!!message}
      onClose={close}
      title="ทำเครื่องหมายคำตอบไม่ดี"
      subtitle="Flag a bad answer for review"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={saving}>
            ยกเลิก
          </Button>
          <Button type="submit" form="flag-form" loading={saving} icon={<Flag className="size-4" />}>
            บันทึก
          </Button>
        </>
      }
    >
      <form id="flag-form" onSubmit={submit} className="space-y-4">
        {message && <p className="line-clamp-4 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">{message.content}</p>}
        <Field id="flag-note" label="หมายเหตุ (ไม่บังคับ)" hint="เช่น ข้อมูลไม่ถูกต้อง หรือควรเพิ่มบทความเรื่องใด">
          <Textarea id="flag-note" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}

export default function ConversationsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
      <ConversationsInner />
    </Suspense>
  );
}

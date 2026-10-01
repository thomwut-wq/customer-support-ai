"use client";
import {
  Bot,
  CheckCircle2,
  Headset,
  Loader2,
  MessageCircle,
  RotateCcw,
  SendHorizonal,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { cn, formatTime } from "@/lib/format";
import type { ChatResponse, Source } from "@/lib/types";

type UiMessage = {
  id: string;
  role: "user" | "assistant" | "notice";
  content: string;
  ts: string;
  messageId?: number | null;
  status?: ChatResponse["status"];
  showEscalate?: boolean;
  feedback?: 1 | -1 | null;
  sources?: Source[];
};

const STORAGE_KEY = "csai-l3md-chat";
const SUGGESTIONS = ["สอบถามเวลาทำการ", "ขั้นตอนคืนสินค้า", "ช่องทางชำระเงิน", "ติดตามพัสดุ", "ลืมรหัสผ่าน"];
const WELCOME: UiMessage = {
  id: "welcome",
  role: "assistant",
  content: "สวัสดีค่ะ ฉันคือผู้ช่วย AI ของ NovaShop ยินดีช่วยตอบคำถามเรื่องการสั่งซื้อ การชำระเงิน การจัดส่ง และการคืนสินค้าตลอด 24 ชั่วโมง เลือกหัวข้อด้านล่าง หรือพิมพ์คำถามได้เลยค่ะ",
  ts: new Date(0).toISOString(),
};

export const OPEN_CHAT_EVENT = "csai:open-chat";

export function openChat(message?: string) {
  window.dispatchEvent(new CustomEvent(OPEN_CHAT_EVENT, { detail: { message } }));
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([WELCOME]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [revealing, setRevealing] = useState<{ id: string; count: number } | null>(null);
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sendRef = useRef<(text: string) => void>(() => {});

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") as { conversationId: string | null; messages: UiMessage[] } | null;
        if (saved?.messages?.length) {
          setMessages(saved.messages);
          setConversationId(saved.conversationId);
        }
      } catch {
        /* ignore corrupted storage */
      }
      setHydrated(true);
    });
    const t = setTimeout(() => setShowTeaser(true), 2500);
    return () => {
      cancelAnimationFrame(id);
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ conversationId, messages: messages.slice(-60) }));
  }, [messages, conversationId, hydrated]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, sending, revealing?.count, escalateOpen]);

  useEffect(() => {
    if (!revealing) return;
    const msg = messages.find((m) => m.id === revealing.id);
    const total = msg ? Array.from(msg.content).length : 0;
    if (revealing.count >= total) {
      const id = requestAnimationFrame(() => setRevealing(null));
      return () => cancelAnimationFrame(id);
    }
    const t = setTimeout(() => setRevealing({ id: revealing.id, count: revealing.count + 3 }), 16);
    return () => clearTimeout(t);
  }, [revealing, messages]);

  const doOpen = useCallback(() => {
    setClosing(false);
    setOpen(true);
    setShowTeaser(false);
    setTimeout(() => inputRef.current?.focus(), 250);
  }, []);

  const doClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 190);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ message?: string }>).detail;
      doOpen();
      if (detail?.message) setTimeout(() => sendRef.current(detail.message!), 300);
    };
    window.addEventListener(OPEN_CHAT_EVENT, handler);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, handler);
  }, [doOpen]);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || sending) return;
      if (text.length > 1000) {
        toast.error("ข้อความยาวเกินไป (สูงสุด 1,000 ตัวอักษร)");
        return;
      }
      setInput("");
      setRevealing(null);
      setMessages((m) => [...m, { id: uid(), role: "user", content: text, ts: new Date().toISOString() }]);
      setSending(true);
      const started = Date.now();
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId, message: text }),
        });
        const data = (await res.json()) as ChatResponse & { error?: string };
        const wait = Math.max(0, 700 - (Date.now() - started));
        await new Promise((r) => setTimeout(r, wait));
        if (res.status === 429 || data.status === "rate_limited") {
          setMessages((m) => [...m, { id: uid(), role: "notice", content: data.reply, ts: new Date().toISOString() }]);
          return;
        }
        if (!res.ok) throw new Error(data.error || "error");
        if (data.conversationId) setConversationId(data.conversationId);
        const id = uid();
        setMessages((m) => [
          ...m,
          {
            id,
            role: "assistant",
            content: data.reply,
            ts: new Date().toISOString(),
            messageId: data.messageId,
            status: data.status,
            showEscalate: data.showEscalate,
            sources: data.sources,
            feedback: null,
          },
        ]);
        setRevealing({ id, count: 0 });
      } catch {
        setMessages((m) => [
          ...m,
          {
            id: uid(),
            role: "assistant",
            content: "ขออภัยค่ะ การเชื่อมต่อขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง หรือกด \"ติดต่อเจ้าหน้าที่\" ได้เลยค่ะ",
            ts: new Date().toISOString(),
            status: "fallback",
            showEscalate: true,
          },
        ]);
      } finally {
        setSending(false);
        inputRef.current?.focus();
      }
    },
    [conversationId, sending]
  );

  useEffect(() => {
    sendRef.current = send;
  }, [send]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const giveFeedback = async (m: UiMessage, value: 1 | -1) => {
    if (!m.messageId || !conversationId) return;
    const next = m.feedback === value ? null : value;
    setMessages((all) => all.map((x) => (x.id === m.id ? { ...x, feedback: next } : x)));
    const res = await fetch("/api/chat/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, messageId: m.messageId, value: next }),
    }).catch(() => null);
    if (res?.ok && next) toast.success(next === 1 ? "ขอบคุณสำหรับคำติชมค่ะ" : "ขอบคุณค่ะ เราจะนำไปปรับปรุงให้ดีขึ้น");
  };

  const resetConversation = () => {
    setMessages([WELCOME]);
    setConversationId(null);
    setEscalateOpen(false);
    setRevealing(null);
    toast.success("เริ่มบทสนทนาใหม่แล้ว");
  };

  const onEscalated = (newConversationId: string, name: string) => {
    setConversationId(newConversationId);
    setEscalateOpen(false);
    setMessages((m) => [
      ...m,
      {
        id: uid(),
        role: "notice",
        content: `ได้รับคำขอของคุณ${name} แล้วค่ะ เจ้าหน้าที่จะติดต่อกลับโดยเร็วที่สุดในเวลาทำการ`,
        ts: new Date().toISOString(),
      },
    ]);
  };

  return (
    <>
      {open && (
        <section
          aria-label="แชตกับผู้ช่วย AI"
          className={cn(
            "fixed inset-x-3 bottom-24 z-50 flex h-[min(640px,calc(100dvh-8rem))] origin-bottom-right flex-col overflow-hidden rounded-3xl bg-white shadow-2xl shadow-indigo-900/20 ring-1 ring-slate-200 sm:right-6 sm:left-auto sm:w-[400px]",
            closing ? "animate-chat-close" : "animate-chat-open"
          )}
        >
          <header className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 px-5 pt-4 pb-5 text-white">
            <div className="pointer-events-none absolute -top-10 -right-10 size-36 rounded-full bg-white/10 blur-2xl" aria-hidden />
            <div className="relative flex items-center gap-3">
              <div className="relative flex size-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
                <Bot className="size-6" aria-hidden />
                <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full bg-emerald-400 ring-2 ring-indigo-600" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">ผู้ช่วย AI NovaShop</p>
                <p className="truncate text-xs text-indigo-100">ออนไลน์ · ตอบทันทีตลอด 24 ชม.</p>
              </div>
              <button
                type="button"
                onClick={resetConversation}
                aria-label="เริ่มบทสนทนาใหม่"
                title="เริ่มบทสนทนาใหม่"
                className="flex size-9 cursor-pointer items-center justify-center rounded-xl text-white/85 transition-colors duration-150 hover:bg-white/15 hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              >
                <RotateCcw className="size-4" />
              </button>
              <button
                type="button"
                onClick={doClose}
                aria-label="ปิดหน้าต่างแชต"
                className="flex size-9 cursor-pointer items-center justify-center rounded-xl text-white/85 transition-colors duration-150 hover:bg-white/15 hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              >
                <X className="size-5" />
              </button>
            </div>
          </header>

          <div ref={scrollRef} className="scrollbar-thin flex-1 space-y-4 overflow-y-auto bg-gradient-to-b from-slate-50 to-white px-4 py-5" aria-live="polite">
            {messages.map((m) => {
              if (m.role === "notice") {
                return (
                  <div key={m.id} className="flex animate-fade-in-up justify-center">
                    <p className="flex max-w-[90%] items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800 ring-1 ring-amber-200">
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                      {m.content}
                    </p>
                  </div>
                );
              }
              const isUser = m.role === "user";
              const isRevealing = revealing?.id === m.id;
              const text = isRevealing ? Array.from(m.content).slice(0, revealing.count).join("") : m.content;
              return (
                <div key={m.id} className={cn("flex animate-fade-in-up gap-2", isUser ? "justify-end" : "justify-start")}>
                  {!isUser && (
                    <div className="mt-auto flex size-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                      <Bot className="size-4" aria-hidden />
                    </div>
                  )}
                  <div className={cn("flex max-w-[80%] min-w-0 flex-col", isUser ? "items-end" : "items-start")}>
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words whitespace-pre-wrap",
                        isUser ? "rounded-br-md bg-indigo-600 text-white shadow-sm shadow-indigo-600/25" : "rounded-bl-md bg-slate-100 text-slate-800"
                      )}
                    >
                      {text}
                      {isRevealing && <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-slate-400" aria-hidden />}
                    </div>
                    {!isUser && !isRevealing && m.id !== "welcome" && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {m.messageId && (
                          <>
                            <button
                              type="button"
                              aria-label="คำตอบนี้มีประโยชน์"
                              onClick={() => giveFeedback(m, 1)}
                              className={cn(
                                "flex size-7 cursor-pointer items-center justify-center rounded-lg transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none",
                                m.feedback === 1 ? "bg-emerald-50 text-emerald-600" : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              )}
                            >
                              <ThumbsUp className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label="คำตอบนี้ไม่มีประโยชน์"
                              onClick={() => giveFeedback(m, -1)}
                              className={cn(
                                "flex size-7 cursor-pointer items-center justify-center rounded-lg transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none",
                                m.feedback === -1 ? "bg-rose-50 text-rose-600" : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              )}
                            >
                              <ThumbsDown className="size-3.5" />
                            </button>
                          </>
                        )}
                        {m.showEscalate && (
                          <button
                            type="button"
                            onClick={() => setEscalateOpen(true)}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-medium text-indigo-700 transition-colors duration-150 hover:border-indigo-300 hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                          >
                            <Headset className="size-3.5" aria-hidden />
                            ติดต่อเจ้าหน้าที่
                          </button>
                        )}
                        {m.sources && m.sources.length > 0 && (
                          <span className="truncate text-[11px] text-slate-400" title={m.sources.map((s) => s.title).join(", ")}>
                            อ้างอิง: {m.sources[0].title}
                          </span>
                        )}
                      </div>
                    )}
                    {m.id !== "welcome" && !isRevealing && (
                      <span className="mt-1 text-[10px] text-slate-400 tabular-nums" suppressHydrationWarning>
                        {formatTime(m.ts)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {sending && (
              <div className="flex animate-fade-in items-end gap-2" aria-label="ผู้ช่วยกำลังพิมพ์">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                  <Bot className="size-4" aria-hidden />
                </div>
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3.5">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="size-2 animate-typing rounded-full bg-slate-400" style={{ animationDelay: `${i * 0.18}s` }} />
                  ))}
                </div>
              </div>
            )}

            {escalateOpen && (
              <EscalateForm conversationId={conversationId} onCancel={() => setEscalateOpen(false)} onDone={onEscalated} />
            )}
          </div>

          <div className="border-t border-slate-100 bg-white px-3 pt-3 pb-3">
            <div className="scrollbar-thin -mx-1 mb-2.5 flex gap-2 overflow-x-auto px-1 pb-1">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={sending}
                  onClick={() => send(s)}
                  className="shrink-0 cursor-pointer rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors duration-150 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
            <form onSubmit={onSubmit} className="flex items-end gap-2">
              <label htmlFor="chat-input" className="sr-only">
                พิมพ์ข้อความ
              </label>
              <textarea
                id="chat-input"
                ref={inputRef}
                rows={1}
                value={input}
                maxLength={1000}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder="พิมพ์คำถามของคุณ..."
                className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 transition-colors duration-150 placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                aria-label="ส่งข้อความ"
                className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30 transition-colors duration-150 hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              >
                {sending ? <Loader2 className="size-5 animate-spin" /> : <SendHorizonal className="size-5" />}
              </button>
            </form>
            <p className="mt-2 flex items-center justify-center gap-1 text-[10px] text-slate-400">
              <Sparkles className="size-3" aria-hidden /> ขับเคลื่อนโดย Customer Support AI · คำตอบอ้างอิงจากฐานความรู้
            </p>
          </div>
        </section>
      )}

      {showTeaser && !open && (
        <button
          type="button"
          onClick={doOpen}
          className="fixed right-24 bottom-8 z-40 hidden animate-scale-in cursor-pointer rounded-2xl rounded-br-sm bg-white px-4 py-3 text-left text-sm shadow-xl ring-1 ring-slate-200 transition-colors duration-150 hover:bg-indigo-50 sm:block"
        >
          <span className="block font-medium text-slate-800">มีคำถาม? แชตกับเราได้เลย</span>
          <span className="block text-xs text-slate-400">AI ตอบทันทีภายในไม่กี่วินาที</span>
        </button>
      )}

      <button
        type="button"
        onClick={open ? doClose : doOpen}
        aria-label={open ? "ปิดแชต" : "เปิดแชตกับผู้ช่วย AI"}
        aria-expanded={open}
        className="group fixed right-5 bottom-5 z-50 flex size-16 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-xl shadow-indigo-600/40 transition-transform duration-200 hover:scale-105 focus-visible:ring-4 focus-visible:ring-indigo-300 focus-visible:outline-none active:scale-95 sm:right-6 sm:bottom-6"
      >
        {!open && <span className="absolute inset-0 animate-ping rounded-full bg-indigo-400 opacity-20" aria-hidden />}
        <span className={cn("absolute transition-transform duration-200", open ? "scale-0 rotate-90" : "scale-100 rotate-0")}>
          <MessageCircle className="size-7" />
        </span>
        <span className={cn("absolute transition-transform duration-200", open ? "scale-100 rotate-0" : "scale-0 -rotate-90")}>
          <X className="size-7" />
        </span>
      </button>
    </>
  );
}

function EscalateForm({
  conversationId,
  onCancel,
  onDone,
}: {
  conversationId: string | null;
  onCancel: () => void;
  onDone: (conversationId: string, name: string) => void;
}) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [errors, setErrors] = useState<{ name?: string; contact?: string }>({});
  const [loading, setLoading] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const contactRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!name.trim()) errs.name = "กรุณากรอกชื่อ";
    const c = contact.trim();
    if (!c) errs.contact = "กรุณากรอกเบอร์โทรหรืออีเมล";
    else if (!/^[0-9+\-\s()]{9,}$/.test(c) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c)) errs.contact = "รูปแบบเบอร์โทรหรืออีเมลไม่ถูกต้อง";
    setErrors(errs);
    if (errs.name) return nameRef.current?.focus();
    if (errs.contact) return contactRef.current?.focus();
    setLoading(true);
    try {
      const res = await fetch("/api/chat/escalate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, name: name.trim(), contact: c }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("ส่งคำขอติดต่อเจ้าหน้าที่เรียบร้อย");
      onDone(data.conversationId, name.trim());
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "ส่งคำขอไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="animate-scale-in rounded-2xl border border-indigo-100 bg-white p-4 shadow-lg shadow-indigo-100">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          <Headset className="size-4" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">ติดต่อเจ้าหน้าที่</p>
          <p className="text-[11px] text-slate-400">ฝากข้อมูลไว้ แล้วเราจะติดต่อกลับค่ะ</p>
        </div>
      </div>
      <div className="space-y-3">
        <div>
          <label htmlFor="esc-name" className="mb-1 block cursor-pointer text-xs font-medium text-slate-600">
            ชื่อของคุณ
          </label>
          <input
            id="esc-name"
            ref={nameRef}
            value={name}
            autoComplete="name"
            onChange={(e) => setName(e.target.value)}
            aria-invalid={!!errors.name}
            className={cn(
              "w-full rounded-lg border px-3 py-2 text-sm transition-colors duration-150 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none",
              errors.name ? "border-rose-400" : "border-slate-200 hover:border-slate-300 focus:border-indigo-400"
            )}
          />
          {errors.name && <p className="mt-1 text-[11px] text-rose-600">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="esc-contact" className="mb-1 block cursor-pointer text-xs font-medium text-slate-600">
            เบอร์โทรศัพท์หรืออีเมล
          </label>
          <input
            id="esc-contact"
            ref={contactRef}
            value={contact}
            inputMode="email"
            autoComplete="tel"
            onChange={(e) => setContact(e.target.value)}
            aria-invalid={!!errors.contact}
            className={cn(
              "w-full rounded-lg border px-3 py-2 text-sm transition-colors duration-150 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none",
              errors.contact ? "border-rose-400" : "border-slate-200 hover:border-slate-300 focus:border-indigo-400"
            )}
          />
          {errors.contact && <p className="mt-1 text-[11px] text-rose-600">{errors.contact}</p>}
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
        >
          ยกเลิก
        </button>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-medium text-white transition-colors duration-150 hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 focus-visible:outline-none disabled:opacity-60"
        >
          {loading && <Loader2 className="size-3.5 animate-spin" />}
          ส่งคำขอ
        </button>
      </div>
    </form>
  );
}

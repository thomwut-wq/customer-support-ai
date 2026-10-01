import {
  ArrowRight,
  BookOpenCheck,
  Bot,
  Clock,
  CreditCard,
  Headset,
  KeyRound,
  MessageSquareText,
  PackageSearch,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Truck,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { ChatWidget } from "@/components/chat/chat-widget";
import { OpenChatButton } from "@/components/landing/open-chat-button";

const topics = [
  { icon: Clock, title: "เวลาทำการ", en: "Business hours", q: "สอบถามเวลาทำการ", tone: "bg-indigo-50 text-indigo-600" },
  { icon: CreditCard, title: "ช่องทางชำระเงิน", en: "Payment methods", q: "มีช่องทางชำระเงินอะไรบ้าง", tone: "bg-emerald-50 text-emerald-600" },
  { icon: RotateCcw, title: "คืนสินค้า / คืนเงิน", en: "Returns & refunds", q: "ขั้นตอนคืนสินค้า", tone: "bg-amber-50 text-amber-600" },
  { icon: PackageSearch, title: "ติดตามพัสดุ", en: "Track my order", q: "ติดตามพัสดุได้อย่างไร", tone: "bg-sky-50 text-sky-600" },
  { icon: Truck, title: "ค่าจัดส่ง", en: "Shipping fees", q: "ค่าจัดส่งเท่าไหร่ ส่งกี่วัน", tone: "bg-violet-50 text-violet-600" },
  { icon: KeyRound, title: "รีเซ็ตรหัสผ่าน", en: "Reset password", q: "ลืมรหัสผ่าน ต้องทำอย่างไร", tone: "bg-rose-50 text-rose-600" },
];

const features = [
  { icon: Zap, title: "ตอบทันทีใน 3 วินาที", en: "Instant answers", body: "ไม่ต้องรอสาย ผู้ช่วย AI พร้อมตอบคำถามที่พบบ่อยตลอด 24 ชั่วโมง ทุกวัน" },
  { icon: BookOpenCheck, title: "อ้างอิงฐานความรู้จริง", en: "Grounded in our knowledge base", body: "ทุกคำตอบดึงจากนโยบายและคู่มือล่าสุดของบริษัท ไม่เดา ไม่แต่งข้อมูลขึ้นเอง" },
  { icon: Headset, title: "ส่งต่อเจ้าหน้าที่ได้ทันที", en: "Seamless human handoff", body: "หากคำถามซับซ้อน กด ‘ติดต่อเจ้าหน้าที่’ แล้วทีมงานจะติดต่อกลับโดยเร็วที่สุด" },
];

export default function Home() {
  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[720px] bg-gradient-to-b from-indigo-50 via-violet-50/40 to-white" aria-hidden />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-200/50 via-violet-200/40 to-sky-200/40 blur-3xl" aria-hidden />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="flex cursor-pointer items-center gap-2.5 rounded-lg focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-md shadow-indigo-500/30">
            <MessageSquareText className="size-5" aria-hidden />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-bold text-slate-900">NovaShop ศูนย์ช่วยเหลือ</span>
            <span className="block text-[11px] text-slate-400">Customer Support AI</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <a href="#topics" className="hidden cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-white/70 hover:text-slate-900 sm:inline-block">
            หัวข้อยอดนิยม
          </a>
          <a href="#features" className="hidden cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-white/70 hover:text-slate-900 sm:inline-block">
            จุดเด่น
          </a>
          <Link
            href="/login"
            className="cursor-pointer rounded-lg border border-slate-200 bg-white/80 px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors duration-150 hover:border-slate-300 hover:bg-white focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
          >
            สำหรับเจ้าหน้าที่
          </Link>
        </nav>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-10 pb-20 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:pt-16">
          <div className="animate-fade-in-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-3 py-1 text-xs font-medium text-indigo-700 shadow-sm">
              <Sparkles className="size-3.5" aria-hidden /> ผู้ช่วย AI พร้อมให้บริการ 24/7
            </span>
            <h1 className="mt-5 text-4xl leading-tight font-bold tracking-tight text-slate-900 sm:text-5xl sm:leading-[1.15]">
              มีคำถาม? <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">ถามได้ทันที</span>
              <br />
              ไม่ต้องรอสาย
            </h1>
            <p className="mt-2 text-sm text-slate-400">Get instant answers from our AI support assistant</p>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
              แชตกับผู้ช่วย AI ของ NovaShop เพื่อสอบถามเรื่องคำสั่งซื้อ การชำระเงิน การจัดส่ง และการคืนสินค้า ได้คำตอบที่ถูกต้องจากฐานความรู้ของเราในไม่กี่วินาที
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <OpenChatButton className="inline-flex h-12 items-center gap-2 rounded-xl bg-indigo-600 px-6 font-medium text-white shadow-lg shadow-indigo-600/30 transition-colors duration-150 hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none">
                <Bot className="size-5" aria-hidden /> เริ่มแชตเลย <ArrowRight className="size-4" aria-hidden />
              </OpenChatButton>
              <a
                href="#topics"
                className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 font-medium text-slate-700 shadow-sm transition-colors duration-150 hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
              >
                ดูหัวข้อยอดนิยม
              </a>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6">
              {[
                ["24/7", "พร้อมให้บริการ", "Always on"],
                ["< 3 วิ", "เวลาตอบเฉลี่ย", "Avg. response"],
                ["11+", "บทความความรู้", "Knowledge articles"],
              ].map(([v, th, en]) => (
                <div key={th}>
                  <dt className="sr-only">{th}</dt>
                  <dd className="text-2xl font-bold text-slate-900 tabular-nums">{v}</dd>
                  <dd className="text-xs text-slate-600">{th}</dd>
                  <dd className="text-[11px] text-slate-400">{en}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative mx-auto w-full max-w-md animate-fade-in-up [animation-delay:120ms]">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-indigo-200/60 to-violet-200/60 blur-2xl" aria-hidden />
            <div className="relative animate-float rounded-3xl bg-white p-5 shadow-2xl shadow-indigo-900/10 ring-1 ring-slate-200/80">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-indigo-600 text-white">
                  <Bot className="size-5" aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">ผู้ช่วย AI NovaShop</p>
                  <p className="flex items-center gap-1.5 text-xs text-emerald-600">
                    <span className="size-1.5 rounded-full bg-emerald-500" /> ออนไลน์
                  </p>
                </div>
              </div>
              <div className="space-y-3 pt-4 text-sm">
                <div className="flex justify-end">
                  <p className="max-w-[80%] rounded-2xl rounded-br-md bg-indigo-600 px-4 py-2.5 text-white">อยากคืนรองเท้า ใส่ไม่พอดี ทำยังไงคะ</p>
                </div>
                <div className="flex">
                  <p className="max-w-[85%] rounded-2xl rounded-bl-md bg-slate-100 px-4 py-2.5 leading-relaxed text-slate-700">
                    คืนได้ภายใน 15 วันหลังได้รับสินค้าค่ะ ไปที่ “คำสั่งซื้อของฉัน” แล้วกด “ขอคืนสินค้า” เลือกให้ขนส่งเข้ารับหรือส่งที่หน้าร้านก็ได้ค่ะ
                  </p>
                </div>
                <div className="flex items-center gap-1 pl-1">
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-600 ring-1 ring-indigo-100">อ้างอิง: นโยบายการคืนสินค้า</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="topics" className="mx-auto max-w-6xl scroll-mt-10 px-5 pb-20 sm:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">หัวข้อที่ลูกค้าถามบ่อย</h2>
            <p className="mt-1 text-xs text-slate-400">Popular help topics — click to ask the assistant</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((t, i) => (
              <OpenChatButton
                key={t.title}
                message={t.q}
                ariaLabel={`ถามเรื่อง${t.title}`}
                className="group flex animate-fade-in-up items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
              >
                <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${t.tone}`} style={{ animationDelay: `${i * 60}ms` }}>
                  <t.icon className="size-6" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-slate-800">{t.title}</span>
                  <span className="block text-xs text-slate-400">{t.en}</span>
                </span>
                <ArrowRight className="size-4 text-slate-300 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-indigo-500" aria-hidden />
              </OpenChatButton>
            ))}
          </div>
        </section>

        <section id="features" className="scroll-mt-10 border-y border-slate-100 bg-slate-50/70">
          <div className="mx-auto grid max-w-6xl gap-6 px-5 py-20 sm:px-8 md:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-md">
                <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25">
                  <f.icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-5 font-semibold text-slate-900">{f.title}</h3>
                <p className="text-xs text-slate-400">{f.en}</p>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700 px-8 py-12 text-white shadow-xl shadow-indigo-600/20 sm:px-12">
            <div className="pointer-events-none absolute -top-16 -right-16 size-64 rounded-full bg-white/10 blur-2xl" aria-hidden />
            <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div>
                <h2 className="text-2xl font-bold sm:text-3xl">ยังหาคำตอบไม่เจอ?</h2>
                <p className="mt-1 text-xs text-indigo-200">Still need help? Our assistant and team are here for you.</p>
                <p className="mt-3 max-w-lg text-indigo-100">ถามผู้ช่วย AI ได้เลย หรือฝากข้อมูลให้เจ้าหน้าที่ติดต่อกลับภายในวันทำการ</p>
              </div>
              <OpenChatButton className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 font-semibold text-indigo-700 shadow-lg transition-colors duration-150 hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-600 focus-visible:outline-none">
                <MessageSquareText className="size-5" aria-hidden /> แชตกับผู้ช่วย AI
              </OpenChatButton>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-slate-100">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm text-slate-500 sm:flex-row sm:px-8">
          <p className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-slate-400" aria-hidden /> © {new Date().getFullYear()} NovaShop · Customer Support AI
          </p>
          <p>โทร 02-123-4567 · LINE @novashop</p>
        </div>
      </footer>

      <ChatWidget />
    </div>
  );
}

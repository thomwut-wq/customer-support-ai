"use client";
import { CheckCircle2, Cpu, Database, KeyRound, Loader2, PlugZap, ShieldCheck, SlidersHorizontal, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/admin/auth-provider";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Badge, Card, PageHeader, Skeleton } from "@/components/ui/misc";
import { cn, formatDateTime } from "@/lib/format";
import { authFetch } from "@/lib/supabase-browser";
import type { EmbeddingProviderId, KeyField, ProviderId, PublicSettings } from "@/lib/types";

const PROVIDERS: { id: ProviderId; th: string; en: string }[] = [
  { id: "openai", th: "OpenAI", en: "GPT-4o, GPT-4.1 …" },
  { id: "anthropic", th: "Anthropic (Claude)", en: "Claude Sonnet / Haiku" },
  { id: "gemini", th: "Google Gemini", en: "Gemini 2.x Flash / Pro" },
  { id: "azure", th: "Azure OpenAI", en: "Your Azure deployment" },
];

const MODEL_OPTIONS: Record<"openai" | "anthropic" | "gemini", string[]> = {
  openai: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1"],
  anthropic: ["claude-sonnet-4-5", "claude-haiku-4-5", "claude-3-5-haiku-latest", "claude-opus-4-1"],
  gemini: ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash-lite"],
};

type Form = {
  provider: ProviderId;
  openai_model: string;
  anthropic_model: string;
  gemini_model: string;
  azure_endpoint: string;
  azure_api_version: string;
  azure_deployment: string;
  azure_embedding_deployment: string;
  embedding_provider: EmbeddingProviderId;
  match_threshold: string;
  top_k: string;
} & Record<KeyField, string>;

type Check = { ok: boolean; latencyMs?: number; message: string };

function toForm(s: PublicSettings): Form {
  return {
    provider: s.provider,
    openai_model: s.openai_model,
    anthropic_model: s.anthropic_model,
    gemini_model: s.gemini_model,
    azure_endpoint: s.azure_endpoint ?? "",
    azure_api_version: s.azure_api_version,
    azure_deployment: s.azure_deployment ?? "",
    azure_embedding_deployment: s.azure_embedding_deployment ?? "",
    embedding_provider: s.embedding_provider,
    match_threshold: String(s.match_threshold),
    top_k: String(s.top_k),
    openai_api_key: "",
    anthropic_api_key: "",
    gemini_api_key: "",
    azure_api_key: "",
    embedding_api_key: "",
  };
}

function Section({ icon, th, en, children }: { icon: ReactNode; th: string; en: string; children: ReactNode }) {
  return (
    <Card className="animate-fade-in-up p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">{icon}</span>
        <div>
          <h2 className="font-semibold text-slate-900">{th}</h2>
          <p className="text-xs text-slate-400">{en}</p>
        </div>
      </div>
      {children}
    </Card>
  );
}

export default function SettingsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [saved, setSaved] = useState<PublicSettings | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [clear, setClear] = useState<Partial<Record<KeyField, boolean>>>({});
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ chat: Check; embedding: Check } | null>(null);

  useEffect(() => {
    if (profile && profile.role !== "ADMIN") {
      toast.error("หน้านี้สำหรับผู้ดูแลระบบเท่านั้น");
      router.replace("/admin");
    }
  }, [profile, router]);

  const load = useCallback(async () => {
    const res = await authFetch("/api/admin/settings");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(data.error || "โหลดการตั้งค่าไม่สำเร็จ");
    setSaved(data);
    setForm(toForm(data));
    setClear({});
  }, []);

  useEffect(() => {
    if (profile?.role !== "ADMIN") return;
    const id = requestAnimationFrame(() => void load());
    return () => cancelAnimationFrame(id);
  }, [profile, load]);

  if (!form || !saved) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-72 w-full rounded-2xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />
      </div>
    );
  }

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => (f ? { ...f, [k]: v } : f));
    setErrors((e) => ({ ...e, [k]: undefined }));
    setResult(null);
  };

  const payload = () => {
    const body: Record<string, unknown> = { ...form, match_threshold: Number(form.match_threshold), top_k: Number(form.top_k) };
    for (const [k, v] of Object.entries(clear)) if (v) body[`clear_${k}`] = true;
    return body;
  };

  const validate = () => {
    const e: Partial<Record<keyof Form, string>> = {};
    const th = Number(form.match_threshold);
    if (!Number.isFinite(th) || th < 0 || th > 1) e.match_threshold = "ค่าต้องอยู่ระหว่าง 0 ถึง 1";
    const k = Number(form.top_k);
    if (!Number.isInteger(k) || k < 1 || k > 20) e.top_k = "ค่าต้องเป็นจำนวนเต็ม 1–20";
    if (form.provider === "azure") {
      if (form.azure_endpoint && !/^https:\/\/.+/i.test(form.azure_endpoint)) e.azure_endpoint = "URL ต้องขึ้นต้นด้วย https://";
      if (!form.azure_api_version.trim()) e.azure_api_version = "กรุณากรอก API version";
    }
    setErrors(e);
    const first = Object.keys(e)[0];
    if (first) document.getElementById(`set-${first}`)?.focus();
    return !first;
  };

  const save = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const res = await authFetch("/api/admin/settings", { method: "PUT", body: JSON.stringify(payload()) });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return toast.error(data.error || "บันทึกการตั้งค่าไม่สำเร็จ");
    setSaved(data.settings);
    setForm(toForm(data.settings));
    setClear({});
    toast.success("บันทึกการตั้งค่า AI เรียบร้อยแล้ว");
    if (data.reindex) toast.info(`สร้างดัชนีฐานความรู้ใหม่: สำเร็จ ${data.reindex.indexed}/${data.reindex.total} บทความ`);
  };

  const cancel = () => {
    setForm(toForm(saved));
    setClear({});
    setErrors({});
    setResult(null);
    toast("ยกเลิกการเปลี่ยนแปลงแล้ว");
  };

  const test = async () => {
    setTesting(true);
    setResult(null);
    const res = await authFetch("/api/admin/settings/test", { method: "POST", body: JSON.stringify(payload()) });
    const data = await res.json().catch(() => ({}));
    setTesting(false);
    if (!res.ok) return toast.error(data.error || "ทดสอบการเชื่อมต่อไม่สำเร็จ");
    setResult(data);
    if (data.chat.ok) toast.success("เชื่อมต่อผู้ให้บริการ AI สำเร็จ");
    else toast.error("เชื่อมต่อผู้ให้บริการ AI ไม่สำเร็จ");
  };

  const keyInput = (field: KeyField, label: string, hint?: string) => {
    const info = saved.keys[field];
    const cleared = clear[field];
    return (
      <Field
        id={`set-${field}`}
        label={label}
        hint={
          info.set && !cleared ? (
            <span className="flex flex-wrap items-center gap-2">
              <span>
                บันทึกไว้แล้ว: <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-600">{info.masked}</code> · เว้นว่างเพื่อใช้ค่าเดิม
              </span>
              <button type="button" onClick={() => setClear((c) => ({ ...c, [field]: true }))} className="cursor-pointer font-medium text-rose-600 transition-colors duration-150 hover:text-rose-800">
                ลบคีย์
              </button>
            </span>
          ) : cleared ? (
            <span className="flex items-center gap-2 text-rose-600">
              คีย์จะถูกลบเมื่อกดบันทึก
              <button type="button" onClick={() => setClear((c) => ({ ...c, [field]: false }))} className="cursor-pointer font-medium text-slate-600 underline-offset-2 hover:underline">
                เลิกทำ
              </button>
            </span>
          ) : (
            hint ?? "ยังไม่ได้ตั้งค่า"
          )
        }
      >
        <div className="relative">
          <KeyRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <Input
            id={`set-${field}`}
            type="password"
            autoComplete="new-password"
            spellCheck={false}
            value={form[field]}
            onChange={(e) => set(field, e.target.value)}
            placeholder={info.set && !cleared ? info.masked ?? "" : "วาง API Key ที่นี่"}
            className="pl-9"
          />
        </div>
      </Field>
    );
  };

  const modelField = (p: "openai" | "anthropic" | "gemini") => {
    const field = `${p}_model` as const;
    const listId = `models-${p}`;
    return (
      <Field id={`set-${field}`} label="ชื่อโมเดล (Model)" hint="เลือกจากรายการหรือพิมพ์ชื่อโมเดลอื่น">
        <Input id={`set-${field}`} list={listId} value={form[field]} onChange={(e) => set(field, e.target.value)} spellCheck={false} />
        <datalist id={listId}>
          {MODEL_OPTIONS[p].map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </Field>
    );
  };

  const embeddingResolved =
    form.embedding_provider === "auto" ? (form.provider === "gemini" ? "Gemini" : form.provider === "azure" ? "Azure OpenAI" : "OpenAI") : PROVIDERS.find((p) => p.id === form.embedding_provider)?.th;

  return (
    <form onSubmit={save} noValidate className="space-y-6 pb-24">
      <PageHeader
        th="ตั้งค่า AI"
        en="AI provider settings"
        description="เลือกผู้ให้บริการโมเดลภาษาที่ใช้ตอบลูกค้า เปลี่ยนได้ทันทีโดยไม่ต้อง Deploy ใหม่"
        actions={
          <Badge tone="emerald">
            <ShieldCheck className="size-3.5" aria-hidden /> เก็บคีย์ไว้ฝั่งเซิร์ฟเวอร์เท่านั้น
          </Badge>
        }
      />

      <Section icon={<Cpu className="size-5" />} th="ผู้ให้บริการแชต" en="Chat completion provider">
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-700">ผู้ให้บริการ (Provider)</legend>
          <label htmlFor="set-provider" className="sr-only">
            ผู้ให้บริการ
          </label>
          <Select id="set-provider" value={form.provider} onChange={(e) => set("provider", e.target.value as ProviderId)} className="sm:max-w-sm">
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.th} — {p.en}
              </option>
            ))}
          </Select>
        </fieldset>

        <div key={form.provider} className="mt-5 grid animate-fade-in gap-5 md:grid-cols-2">
          {form.provider === "openai" && (
            <>
              {keyInput("openai_api_key", "OpenAI API Key")}
              {modelField("openai")}
            </>
          )}
          {form.provider === "anthropic" && (
            <>
              {keyInput("anthropic_api_key", "Anthropic API Key")}
              {modelField("anthropic")}
            </>
          )}
          {form.provider === "gemini" && (
            <>
              {keyInput("gemini_api_key", "Google Gemini API Key")}
              {modelField("gemini")}
            </>
          )}
          {form.provider === "azure" && (
            <>
              {keyInput("azure_api_key", "Azure OpenAI API Key")}
              <Field id="set-azure_endpoint" label="Endpoint URL" error={errors.azure_endpoint} hint="เช่น https://your-resource.openai.azure.com">
                <Input id="set-azure_endpoint" type="url" inputMode="url" value={form.azure_endpoint} onChange={(e) => set("azure_endpoint", e.target.value)} invalid={!!errors.azure_endpoint} spellCheck={false} />
              </Field>
              <Field id="set-azure_deployment" label="ชื่อ Deployment (แชต)" hint="ชื่อ deployment ของโมเดลแชต เช่น gpt-4o-mini">
                <Input id="set-azure_deployment" value={form.azure_deployment} onChange={(e) => set("azure_deployment", e.target.value)} spellCheck={false} />
              </Field>
              <Field id="set-azure_api_version" label="API Version" error={errors.azure_api_version}>
                <Input id="set-azure_api_version" value={form.azure_api_version} onChange={(e) => set("azure_api_version", e.target.value)} invalid={!!errors.azure_api_version} spellCheck={false} />
              </Field>
            </>
          )}
        </div>
      </Section>

      <Section icon={<Database className="size-5" />} th="Embedding สำหรับค้นหาฐานความรู้" en="Embeddings for RAG retrieval (1536 dimensions)">
        <div className="grid gap-5 md:grid-cols-2">
          <Field id="set-embedding_provider" label="ผู้ให้บริการ Embedding" hint={`ใช้งานจริง: ${embeddingResolved}${form.provider === "anthropic" && form.embedding_provider === "auto" ? " (Anthropic ไม่มี Embedding API)" : ""}`}>
            <Select id="set-embedding_provider" value={form.embedding_provider} onChange={(e) => set("embedding_provider", e.target.value as EmbeddingProviderId)}>
              <option value="auto">อัตโนมัติ (ตามผู้ให้บริการแชต)</option>
              <option value="openai">OpenAI · text-embedding-3-small</option>
              <option value="gemini">Google Gemini · gemini-embedding-001</option>
              <option value="azure">Azure OpenAI · embedding deployment</option>
            </Select>
          </Field>
          {keyInput("embedding_api_key", "Embedding API Key (ไม่บังคับ)", "เว้นว่างเพื่อใช้ API Key ของผู้ให้บริการเดียวกันด้านบน")}
          {(form.embedding_provider === "azure" || (form.embedding_provider === "auto" && form.provider === "azure")) && (
            <Field id="set-azure_embedding_deployment" label="Azure Embedding Deployment" hint="เช่น text-embedding-3-small">
              <Input id="set-azure_embedding_deployment" value={form.azure_embedding_deployment} onChange={(e) => set("azure_embedding_deployment", e.target.value)} spellCheck={false} />
            </Field>
          )}
        </div>
      </Section>

      <Section icon={<SlidersHorizontal className="size-5" />} th="การค้นหาและความมั่นใจ" en="Retrieval & confidence">
        <div className="grid gap-5 md:grid-cols-2">
          <Field id="set-match_threshold" label="เกณฑ์ความใกล้เคียงขั้นต่ำ (Match threshold)" error={errors.match_threshold} hint="ต่ำกว่าเกณฑ์นี้ ผู้ช่วยจะถามเพิ่มเติมหรือเสนอให้ติดต่อเจ้าหน้าที่ (แนะนำ 0.7)">
            <Input id="set-match_threshold" type="number" inputMode="decimal" step="0.01" min="0" max="1" value={form.match_threshold} onChange={(e) => set("match_threshold", e.target.value)} invalid={!!errors.match_threshold} />
          </Field>
          <Field id="set-top_k" label="จำนวนส่วนเนื้อหาที่ดึงมา (Top K)" error={errors.top_k} hint="จำนวนชิ้นข้อมูลที่ใช้เป็นบริบทในการตอบ (แนะนำ 5)">
            <Input id="set-top_k" type="number" inputMode="numeric" step="1" min="1" max="20" value={form.top_k} onChange={(e) => set("top_k", e.target.value)} invalid={!!errors.top_k} />
          </Field>
        </div>
      </Section>

      <Card className="animate-fade-in-up p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-semibold text-slate-900">
              <PlugZap className="size-4 text-indigo-600" aria-hidden /> ทดสอบการเชื่อมต่อ
            </h2>
            <p className="text-xs text-slate-400">Test connection using the values in this form (not yet saved)</p>
          </div>
          <Button variant="outline" onClick={test} loading={testing} icon={<PlugZap className="size-4" />}>
            ทดสอบการเชื่อมต่อ
          </Button>
        </div>
        {(testing || result) && (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {(["chat", "embedding"] as const).map((k) => {
              const r = result?.[k];
              return (
                <div
                  key={k}
                  className={cn(
                    "flex animate-fade-in items-start gap-3 rounded-xl border px-4 py-3",
                    !r ? "border-slate-200 bg-slate-50" : r.ok ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"
                  )}
                >
                  {!r ? (
                    <Loader2 className="mt-0.5 size-5 shrink-0 animate-spin text-slate-400" aria-hidden />
                  ) : r.ok ? (
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden />
                  ) : (
                    <XCircle className="mt-0.5 size-5 shrink-0 text-rose-600" aria-hidden />
                  )}
                  <div className="min-w-0">
                    <p className={cn("text-sm font-semibold", !r ? "text-slate-600" : r.ok ? "text-emerald-800" : "text-rose-800")}>
                      {k === "chat" ? "โมเดลแชต" : "Embedding"} {r ? (r.ok ? "· เชื่อมต่อสำเร็จ" : "· เชื่อมต่อไม่สำเร็จ") : "· กำลังทดสอบ..."}
                    </p>
                    {r && (
                      <p className="mt-0.5 line-clamp-3 text-xs break-words text-slate-600">
                        {r.message}
                        {r.latencyMs != null && <span className="tabular-nums"> · {r.latencyMs} ms</span>}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="sticky bottom-0 z-20 -mx-4 border-t border-slate-200 bg-white/90 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-400">บันทึกล่าสุด {formatDateTime(saved.updated_at)}</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={cancel} disabled={saving}>
              ยกเลิก
            </Button>
            <Button type="submit" loading={saving}>
              บันทึกการตั้งค่า
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

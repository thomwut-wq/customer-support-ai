"use client";
import { BookOpen, CircleAlert, CircleCheck, Clock3, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button, IconButton } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Badge, Card, EmptyState, PageHeader, Skeleton, categoryTone } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { cn, formatDateTime } from "@/lib/format";
import { authFetch } from "@/lib/supabase-browser";
import type { Article } from "@/lib/types";

type Row = Article & { chunk_count: number };
type Draft = { title: string; category: string; content: string; is_published: boolean };
type Errors = Partial<Record<keyof Draft, string>>;

const DEFAULT_CATEGORIES = ["ทั่วไป", "การชำระเงิน", "การจัดส่ง", "คืนสินค้า", "บัญชีผู้ใช้", "การรับประกัน"];

function IndexBadge({ a }: { a: Row }) {
  if (a.embedding_status === "indexed")
    return (
      <Badge tone="emerald">
        <CircleCheck className="size-3" aria-hidden /> พร้อมใช้ · {a.chunk_count} ส่วน
      </Badge>
    );
  if (a.embedding_status === "failed")
    return (
      <span title={a.embedding_error ?? undefined}>
        <Badge tone="rose">
          <CircleAlert className="size-3" aria-hidden /> สร้างดัชนีไม่สำเร็จ
        </Badge>
      </span>
    );
  return (
    <span title={a.embedding_error ?? "รอการตั้งค่า Embedding API"}>
      <Badge tone="slate">
        <Clock3 className="size-3" aria-hidden /> รอสร้างดัชนี
      </Badge>
    </span>
  );
}

export default function KnowledgePage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [reindexing, setReindexing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await authFetch("/api/admin/articles");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRows(data.articles);
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "โหลดบทความไม่สำเร็จ");
      setRows([]);
    }
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => void load());
    return () => cancelAnimationFrame(id);
  }, [load]);

  const categories = useMemo(() => Array.from(new Set([...(rows ?? []).map((r) => r.category), ...DEFAULT_CATEGORIES])).sort((a, b) => a.localeCompare(b, "th")), [rows]);
  const usedCategories = useMemo(() => Array.from(new Set((rows ?? []).map((r) => r.category))).sort((a, b) => a.localeCompare(b, "th")), [rows]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (rows ?? []).filter((r) => (cat === "all" || r.category === cat) && (!term || r.title.toLowerCase().includes(term) || r.content.toLowerCase().includes(term)));
  }, [rows, q, cat]);

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    const res = await authFetch(`/api/admin/articles/${deleting.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setDeleteLoading(false);
    if (!res.ok) return toast.error(data.error || "ลบบทความไม่สำเร็จ");
    setRows((rs) => rs?.filter((r) => r.id !== deleting.id) ?? null);
    toast.success(`ลบบทความ “${deleting.title}” แล้ว`);
    setDeleting(null);
  };

  const reindex = async () => {
    setReindexing(true);
    const res = await authFetch("/api/admin/reindex", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setReindexing(false);
    if (!res.ok) return toast.error(data.error || "สร้างดัชนีไม่สำเร็จ");
    if (!data.configured) toast.warning("ยังไม่ได้ตั้งค่า Embedding API — ไปที่หน้า ‘ตั้งค่า AI’ เพื่อเพิ่ม API Key");
    else if (data.failed) toast.warning(`สร้างดัชนีสำเร็จ ${data.indexed} บทความ ล้มเหลว ${data.failed} บทความ`);
    else toast.success(`สร้างดัชนีใหม่สำเร็จ ${data.indexed} บทความ`);
    void load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        th="ฐานความรู้"
        en="Knowledge base articles"
        description="บทความเหล่านี้คือแหล่งข้อมูลเดียวที่ผู้ช่วย AI ใช้ตอบลูกค้า ระบบจะแบ่งเนื้อหาและสร้าง Embedding ให้อัตโนมัติเมื่อบันทึก"
        actions={
          <>
            <Button variant="secondary" onClick={reindex} loading={reindexing} icon={<RefreshCw className="size-4" />}>
              สร้างดัชนีใหม่
            </Button>
            <Button onClick={() => setEditing("new")} icon={<Plus className="size-4" />}>
              เพิ่มบทความ
            </Button>
          </>
        }
      />

      <Card className="animate-fade-in-up overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <label htmlFor="kb-search" className="sr-only">
              ค้นหาบทความ
            </label>
            <Input id="kb-search" type="search" placeholder="ค้นหาหัวข้อหรือเนื้อหา..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <label htmlFor="kb-cat" className="sr-only">
            กรองหมวดหมู่
          </label>
          <Select id="kb-cat" value={cat} onChange={(e) => setCat(e.target.value)} className="sm:w-52">
            <option value="all">ทุกหมวดหมู่</option>
            {usedCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <p className="shrink-0 text-xs text-slate-400 tabular-nums">
            {filtered.length} / {rows?.length ?? 0} บทความ
          </p>
        </div>

        <div className="scrollbar-thin max-h-[calc(100dvh-300px)] overflow-auto">
          <table className="w-full min-w-[820px] table-fixed text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50/95 text-xs text-slate-500 backdrop-blur">
              <tr>
                <th scope="col" className="w-[40%] px-4 py-3 font-medium">
                  หัวข้อ <span className="font-normal text-slate-400">Title</span>
                </th>
                <th scope="col" className="w-[15%] px-4 py-3 font-medium">
                  หมวดหมู่ <span className="font-normal text-slate-400">Category</span>
                </th>
                <th scope="col" className="w-[19%] px-4 py-3 font-medium">
                  สถานะ <span className="font-normal text-slate-400">Status</span>
                </th>
                <th scope="col" className="w-[16%] px-4 py-3 font-medium">
                  แก้ไขล่าสุด <span className="font-normal text-slate-400">Updated</span>
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">การดำเนินการ</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!rows ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-4" colSpan={5}>
                      <Skeleton className="h-10 w-full" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      icon={<BookOpen className="size-6" />}
                      title={rows.length ? "ไม่พบบทความที่ค้นหา" : "ยังไม่มีบทความ"}
                      description={rows.length ? "ลองเปลี่ยนคำค้นหาหรือหมวดหมู่" : "เพิ่มบทความแรกเพื่อให้ผู้ช่วย AI เริ่มตอบคำถามได้"}
                      action={
                        <Button onClick={() => setEditing("new")} icon={<Plus className="size-4" />}>
                          เพิ่มบทความ
                        </Button>
                      }
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((a, i) => (
                  <tr
                    key={a.id}
                    onClick={() => setEditing(a)}
                    className="group animate-fade-in-up cursor-pointer transition-colors duration-150 hover:bg-indigo-50/40"
                    style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}
                  >
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing(a);
                        }}
                        className="block max-w-full cursor-pointer truncate text-left font-medium text-slate-800 transition-colors duration-150 group-hover:text-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                      >
                        {a.title}
                      </button>
                      <p className="mt-0.5 truncate text-xs text-slate-400">{a.content}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge tone={categoryTone(a.category)}>{a.category}</Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {!a.is_published && <Badge tone="slate">ฉบับร่าง</Badge>}
                        <IndexBadge a={a} />
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs whitespace-nowrap text-slate-500 tabular-nums">{formatDateTime(a.updated_at)}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <IconButton label={`แก้ไข ${a.title}`} onClick={() => setEditing(a)} className="hover:bg-indigo-100 hover:text-indigo-700">
                          <Pencil className="size-4" />
                        </IconButton>
                        <IconButton label={`ลบ ${a.title}`} onClick={() => setDeleting(a)} className="hover:bg-rose-50 hover:text-rose-600">
                          <Trash2 className="size-4" />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <ArticleModal
        key={editing === "new" ? "new" : editing?.id ?? "closed"}
        article={editing}
        categories={categories}
        onClose={() => setEditing(null)}
        onSaved={(a, warning) => {
          setRows((rs) => {
            const list = rs ?? [];
            return list.some((r) => r.id === a.id) ? list.map((r) => (r.id === a.id ? a : r)) : [a, ...list];
          });
          if (warning) toast.warning(warning);
          setEditing(null);
          void load();
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deleteLoading}
        title="ลบบทความนี้?"
        description={
          <>
            บทความ <strong className="text-slate-800">“{deleting?.title}”</strong> และข้อมูล Embedding ทั้งหมดจะถูกลบถาวร ผู้ช่วย AI จะไม่สามารถใช้ข้อมูลนี้ตอบลูกค้าได้อีก
          </>
        }
      />
    </div>
  );
}

function ArticleModal({
  article,
  categories,
  onClose,
  onSaved,
}: {
  article: Row | "new" | null;
  categories: string[];
  onClose: () => void;
  onSaved: (a: Row, warning?: string) => void;
}) {
  const isNew = article === "new";
  const initial: Draft = article && article !== "new" ? { title: article.title, category: article.category, content: article.content, is_published: article.is_published } : { title: "", category: "", content: "", is_published: true };
  const [draft, setDraft] = useState<Draft>(initial);
  const [customCat, setCustomCat] = useState(!!initial.category && !categories.includes(initial.category));
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const catRef = useRef<HTMLInputElement & HTMLSelectElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const validate = (): Errors => {
    const e: Errors = {};
    if (draft.title.trim().length < 3) e.title = "กรุณากรอกหัวข้ออย่างน้อย 3 ตัวอักษร";
    if (!draft.category.trim()) e.category = "กรุณาเลือกหรือกรอกหมวดหมู่";
    if (draft.content.trim().length < 20) e.content = "เนื้อหาควรมีอย่างน้อย 20 ตัวอักษร";
    return e;
  };

  const focusFirst = (e: Errors) => {
    if (e.title) titleRef.current?.focus();
    else if (e.category) catRef.current?.focus();
    else if (e.content) contentRef.current?.focus();
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return focusFirst(e);
    setSaving(true);
    const res = await authFetch(isNew ? "/api/admin/articles" : `/api/admin/articles/${(article as Row).id}`, {
      method: isNew ? "POST" : "PUT",
      body: JSON.stringify(draft),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      if (data.errors) {
        setErrors(data.errors);
        focusFirst(data.errors);
      }
      return toast.error(data.error || "บันทึกบทความไม่สำเร็จ");
    }
    toast.success(isNew ? "เพิ่มบทความเรียบร้อยแล้ว" : "บันทึกการแก้ไขเรียบร้อยแล้ว");
    const warning = data.index && !data.index.ok ? `บันทึกแล้ว แต่ยังสร้าง Embedding ไม่ได้: ${data.index.error ?? "ยังไม่ได้ตั้งค่า Embedding API"}` : undefined;
    onSaved({ chunk_count: 0, ...data.article }, warning);
  };

  return (
    <Modal
      open={!!article}
      onClose={onClose}
      title={isNew ? "เพิ่มบทความใหม่" : "แก้ไขบทความ"}
      subtitle={isNew ? "New knowledge article" : "Edit knowledge article"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            ยกเลิก
          </Button>
          <Button type="submit" form="article-form" loading={saving}>
            {isNew ? "บันทึกบทความ" : "บันทึกการแก้ไข"}
          </Button>
        </>
      }
    >
      <form id="article-form" onSubmit={submit} noValidate className="space-y-5">
        <Field id="art-title" label="หัวข้อ" error={errors.title}>
          <Input id="art-title" ref={titleRef} value={draft.title} maxLength={200} onChange={(e) => set("title", e.target.value)} invalid={!!errors.title} placeholder="เช่น นโยบายการคืนสินค้า" />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="art-category"
            label="หมวดหมู่"
            error={errors.category}
            hint={
              <button type="button" onClick={() => setCustomCat((c) => !c)} className="cursor-pointer font-medium text-indigo-600 transition-colors duration-150 hover:text-indigo-800">
                {customCat ? "เลือกจากรายการ" : "+ สร้างหมวดหมู่ใหม่"}
              </button>
            }
          >
            {customCat ? (
              <Input id="art-category" ref={catRef} value={draft.category} maxLength={60} onChange={(e) => set("category", e.target.value)} invalid={!!errors.category} placeholder="ชื่อหมวดหมู่ใหม่" />
            ) : (
              <Select id="art-category" ref={catRef} value={draft.category} onChange={(e) => set("category", e.target.value)} aria-invalid={!!errors.category || undefined} className={cn(errors.category && "border-rose-400")}>
                <option value="">— เลือกหมวดหมู่ —</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-slate-700">การเผยแพร่</span>
            <label htmlFor="art-published" className="flex h-[42px] cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 transition-colors duration-150 hover:bg-slate-50">
              <input id="art-published" type="checkbox" checked={draft.is_published} onChange={(e) => set("is_published", e.target.checked)} className="size-4 cursor-pointer accent-indigo-600" />
              <span className="text-sm text-slate-700">เผยแพร่ให้ผู้ช่วย AI ใช้ตอบลูกค้า</span>
            </label>
          </div>
        </div>
        <Field id="art-content" label="เนื้อหา" error={errors.content} hint={`${draft.content.length.toLocaleString("th-TH")} ตัวอักษร · ระบบจะแบ่งเป็นส่วนละประมาณ 500 ตัวอักษรเพื่อสร้าง Embedding`}>
          <Textarea id="art-content" ref={contentRef} rows={12} value={draft.content} maxLength={20000} onChange={(e) => set("content", e.target.value)} invalid={!!errors.content} placeholder="อธิบายรายละเอียดที่ลูกค้าควรรู้..." />
        </Field>
      </form>
    </Modal>
  );
}

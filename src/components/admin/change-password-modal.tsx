"use client";
import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { getSupabase } from "@/lib/supabase-browser";
import { Button } from "../ui/button";
import { Field, Input } from "../ui/field";
import { Modal } from "../ui/modal";

export function ChangePasswordModal({ open, onClose, email }: { open: boolean; onClose: () => void; email: string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});
  const [loading, setLoading] = useState(false);
  const currentRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  const close = () => {
    setCurrent("");
    setNext("");
    setConfirm("");
    setErrors({});
    onClose();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!current) errs.current = "กรุณากรอกรหัสผ่านปัจจุบัน";
    if (next.length < 8) errs.next = "รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร";
    else if (next === current) errs.next = "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม";
    if (confirm !== next) errs.confirm = "รหัสผ่านยืนยันไม่ตรงกัน";
    setErrors(errs);
    const first = (["current", "next", "confirm"] as const).find((k) => errs[k]);
    if (first) return ({ current: currentRef, next: nextRef, confirm: confirmRef })[first].current?.focus();
    setLoading(true);
    const supabase = getSupabase();
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password: current });
    if (authErr) {
      setLoading(false);
      setErrors({ current: "รหัสผ่านปัจจุบันไม่ถูกต้อง" });
      return currentRef.current?.focus();
    }
    const { error } = await supabase.auth.updateUser({ password: next });
    setLoading(false);
    if (error) {
      toast.error(`เปลี่ยนรหัสผ่านไม่สำเร็จ: ${error.message}`);
      return;
    }
    toast.success("เปลี่ยนรหัสผ่านเรียบร้อยแล้ว");
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="เปลี่ยนรหัสผ่าน"
      subtitle="Change password"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={loading}>
            ยกเลิก
          </Button>
          <Button type="submit" form="change-password-form" loading={loading}>
            บันทึกรหัสผ่าน
          </Button>
        </>
      }
    >
      <form id="change-password-form" onSubmit={submit} noValidate className="space-y-4">
        <Field id="pw-current" label="รหัสผ่านปัจจุบัน" error={errors.current}>
          <Input id="pw-current" ref={currentRef} type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} invalid={!!errors.current} />
        </Field>
        <Field id="pw-new" label="รหัสผ่านใหม่" hint="อย่างน้อย 8 ตัวอักษร" error={errors.next}>
          <Input id="pw-new" ref={nextRef} type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} invalid={!!errors.next} />
        </Field>
        <Field id="pw-confirm" label="ยืนยันรหัสผ่านใหม่" error={errors.confirm}>
          <Input id="pw-confirm" ref={confirmRef} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} invalid={!!errors.confirm} />
        </Field>
      </form>
    </Modal>
  );
}

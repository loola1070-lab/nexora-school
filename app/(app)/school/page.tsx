"use client";
import { useState, type FormEvent } from "react";
import { RotateCcw, Save } from "lucide-react";
import { useStore, useUser } from "@/lib/store";
import { canEditSchool } from "@/lib/permissions";
import { Button, Card, ConfirmModal, Field, PageHeader, inputCls } from "@/components/ui";
import type { School } from "@/lib/types";

export default function SchoolPage() {
  const { db, updateSchool, resetDemo, notify } = useStore();
  const user = useUser();
  const editable = canEditSchool(user.role);
  const [f, setF] = useState<School>(db.school);
  const [err, setErr] = useState<Partial<Record<keyof School, string>>>({});
  const [confirm, setConfirm] = useState(false);
  const set = <K extends keyof School>(k: K, v: School[K]) => setF((p) => ({ ...p, [k]: v }));

  function submit(e: FormEvent) {
    e.preventDefault();
    const er: typeof err = {};
    if (!f.name.trim()) er.name = "اسم المدرسة مطلوب";
    if (!f.year.trim()) er.year = "العام الدراسي مطلوب";
    setErr(er);
    if (Object.keys(er).length) return notify("راجع الحقول المطلوبة.", "error");
    updateSchool({ ...f, name: f.name.trim(), year: f.year.trim() });
    notify("تم حفظ بيانات المدرسة.");
  }

  return (
    <>
      <PageHeader title="بيانات المدرسة والإعدادات" subtitle={editable ? undefined : "العرض فقط — التعديل لمديرة المدرسة."} />
      <Card className="max-w-3xl p-6">
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <Field label="اسم المدرسة" error={err.name}><input className={inputCls} disabled={!editable} value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="العام الدراسي" error={err.year}><input className={inputCls} disabled={!editable} value={f.year} onChange={(e) => set("year", e.target.value)} placeholder="1447-1448" /></Field>
          <Field label="المدينة"><input className={inputCls} disabled={!editable} value={f.city} onChange={(e) => set("city", e.target.value)} /></Field>
          <Field label="المرحلة الدراسية">
            <select className={inputCls} disabled={!editable} value={f.stage} onChange={(e) => set("stage", e.target.value)}>
              <option value="">— اختر —</option>
              {["رياض أطفال", "ابتدائي", "متوسط", "ثانوي", "مدمج"].map((x) => <option key={x}>{x}</option>)}
            </select>
          </Field>
          <div className="sm:col-span-2"><Field label="اسم مديرة المدرسة"><input className={inputCls} disabled={!editable} value={f.principal} onChange={(e) => set("principal", e.target.value)} /></Field></div>
          {editable && <div className="sm:col-span-2"><Button type="submit"><Save className="h-4 w-4" /> حفظ</Button></div>}
        </form>
      </Card>

      {editable && (
        <Card className="mt-6 max-w-3xl p-6">
          <h2 className="font-bold text-navy-800">إدارة البيانات التجريبية</h2>
          <p className="mt-2 text-sm leading-7 text-navy-600">البيانات الحالية تجريبية ومحفوظة في متصفحك فقط. إعادة التعيين تحذف كل تعديلاتك وترجع البيانات التجريبية الأصلية.</p>
          <Button variant="secondary" className="mt-4" onClick={() => setConfirm(true)}><RotateCcw className="h-4 w-4" /> إعادة تعيين البيانات التجريبية</Button>
        </Card>
      )}
      <ConfirmModal open={confirm} title="إعادة تعيين البيانات" message="سيتم حذف جميع التعديلات والشواهد المضافة في هذا المتصفح. هل تريد المتابعة؟"
        onClose={() => setConfirm(false)} onConfirm={async () => { await resetDemo(); notify("تمت إعادة البيانات التجريبية."); }} />
    </>
  );
}

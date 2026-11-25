"use client";
import { useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useLookups, useStore, useUser } from "@/lib/store";
import { isManager } from "@/lib/permissions";
import { Badge, Button, Card, ConfirmModal, Empty, Field, FormFooter, Modal, PageHeader, inputCls } from "@/components/ui";
import type { Plan, PlanStatus } from "@/lib/types";
import { PLAN_LABELS, PLAN_TONE, uid } from "@/lib/utils";

function PlanForm({ initial, onClose }: { initial: Plan; onClose: () => void }) {
  const { db, upsert, notify } = useStore();
  const [f, setF] = useState(initial);
  const [err, setErr] = useState<Record<string, string>>({});
  async function submit(e: FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!f.title.trim()) er.title = "عنوان الخطة مطلوب";
    if (f.startDate && f.endDate && f.endDate < f.startDate) er.endDate = "تاريخ النهاية قبل البداية";
    setErr(er);
    if (Object.keys(er).length) return;
    if (!(await upsert("plans", { ...f, title: f.title.trim() }))) return;
    notify("تم حفظ خطة التحسين.");
    onClose();
  }
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="عنوان الخطة" error={err.title}><input className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
      <Field label="المؤشر المرتبط">
        <select className={inputCls} value={f.indicatorId} onChange={(e) => setF({ ...f, indicatorId: e.target.value })}>
          <option value="">— بدون —</option>{db.indicators.map((i) => <option key={i.id} value={i.id}>{i.code} — {i.title}</option>)}
        </select>
      </Field>
      <Field label="الهدف"><textarea rows={2} className={inputCls} value={f.goal} onChange={(e) => setF({ ...f, goal: e.target.value })} /></Field>
      <Field label="الإجراءات (سطر لكل إجراء)"><textarea rows={4} className={inputCls} value={f.actions} onChange={(e) => setF({ ...f, actions: e.target.value })} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="المسؤولة"><select className={inputCls} value={f.ownerId} onChange={(e) => setF({ ...f, ownerId: e.target.value })}><option value="">— غير محددة —</option>{db.users.filter((u) => u.active).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>
        <Field label="الحالة"><select className={inputCls} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as PlanStatus })}>{(Object.keys(PLAN_LABELS) as PlanStatus[]).map((s) => <option key={s} value={s}>{PLAN_LABELS[s]}</option>)}</select></Field>
        <Field label="البداية"><input type="date" className={inputCls} value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></Field>
        <Field label="النهاية" error={err.endDate}><input type="date" className={inputCls} value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} /></Field>
      </div>
      <FormFooter onCancel={onClose} />
    </form>
  );
}

export default function ImprovementPage() {
  const { db, remove, notify } = useStore();
  const manager = isManager(useUser().role);
  const { indicatorById, userById } = useLookups();
  const [fs, setFs] = useState("");
  const [edit, setEdit] = useState<Plan | null>(null);
  const [del, setDel] = useState<Plan | null>(null);
  const rows = db.plans.filter((p) => !fs || p.status === fs);

  return (
    <>
      <PageHeader title="خطط التحسين" actions={manager && <Button onClick={() => setEdit({ id: uid(), title: "", indicatorId: "", goal: "", actions: "", ownerId: "", startDate: "", endDate: "", status: "draft" })}><Plus className="h-4 w-4" /> خطة جديدة</Button>} />
      <div className="mb-4"><select className={`${inputCls} !w-auto`} aria-label="الحالة" value={fs} onChange={(e) => setFs(e.target.value)}><option value="">كل الحالات</option>{(Object.keys(PLAN_LABELS) as PlanStatus[]).map((s) => <option key={s} value={s}>{PLAN_LABELS[s]}</option>)}</select></div>
      {rows.length === 0 ? <Card><Empty text="لا توجد خطط تحسين." /></Card> : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((p) => (
            <Card key={p.id} className="p-5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-navy-900">{p.title}</h3><Badge tone={PLAN_TONE[p.status]}>{PLAN_LABELS[p.status]}</Badge>
              </div>
              <p className="mt-1 text-xs text-navy-500">{indicatorById.get(p.indicatorId)?.code ?? "بدون مؤشر"} · {userById.get(p.ownerId)?.name ?? "غير محددة"} · {p.startDate || "—"} → {p.endDate || "—"}</p>
              {p.goal && <p className="mt-3 text-sm"><b>الهدف: </b>{p.goal}</p>}
              {p.actions && <ul className="mt-3 list-disc space-y-1 ps-5 text-sm text-navy-700">{p.actions.split("\n").filter(Boolean).map((a, i) => <li key={i}>{a}</li>)}</ul>}
              {manager && <div className="mt-4 flex gap-1">
                <Button variant="secondary" onClick={() => setEdit(p)}><Pencil className="h-4 w-4" /> تعديل</Button>
                <Button variant="ghost" aria-label="حذف" onClick={() => setDel(p)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
              </div>}
            </Card>
          ))}
        </div>
      )}
      <Modal wide open={!!edit} onClose={() => setEdit(null)} title={edit && db.plans.some((p) => p.id === edit.id) ? "تعديل خطة" : "خطة تحسين جديدة"}>
        {edit && <PlanForm initial={edit} onClose={() => setEdit(null)} />}
      </Modal>
      <ConfirmModal open={!!del} title="حذف الخطة" message="سيتم حذف الخطة نهائيًا." onClose={() => setDel(null)} onConfirm={async () => { if (del && (await remove("plans", del.id))) notify("تم حذف الخطة."); }} />
    </>
  );
}

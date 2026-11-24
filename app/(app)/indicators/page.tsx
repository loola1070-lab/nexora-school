"use client";
import { useMemo, useState, type FormEvent } from "react";
import { Download, FilePlus2, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useLookups, useStore, useUser } from "@/lib/store";
import { canEditIndicator, isManager } from "@/lib/permissions";
import { Badge, Button, Card, ConfirmModal, Empty, Field, FormFooter, Modal, PageHeader, SearchInput, Td, Th, inputCls } from "@/components/ui";
import EvidenceModal from "@/components/EvidenceModal";
import ImportModal from "@/components/ImportModal";
import { exportIndicators } from "@/lib/excel";
import type { Indicator, IndicatorStatus } from "@/lib/types";
import { STATUS_LABELS, STATUS_ORDER, STATUS_TONE, isOverdue, uid } from "@/lib/utils";

function IndicatorForm({ initial, onClose }: { initial: Indicator; onClose: () => void }) {
  const { db, upsert, notify } = useStore();
  const [f, setF] = useState(initial);
  const [err, setErr] = useState<Record<string, string>>({});
  const stds = db.standards.filter((s) => s.domainId === f.domainId);
  function submit(e: FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!f.domainId) er.domainId = "اختر المجال";
    if (!f.standardId) er.standardId = "اختر المعيار";
    if (!f.title.trim()) er.title = "نص المؤشر مطلوب";
    setErr(er);
    if (Object.keys(er).length) return;
    upsert("indicators", { ...f, title: f.title.trim(), code: f.code.trim(), description: f.description.trim() });
    notify("تم حفظ المؤشر.");
    onClose();
  }
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="المجال" error={err.domainId}>
          <select className={inputCls} value={f.domainId} onChange={(e) => setF({ ...f, domainId: e.target.value, standardId: "" })}>
            <option value="">— اختر —</option>{db.domains.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
          </select>
        </Field>
        <Field label="المعيار" error={err.standardId}>
          <select className={inputCls} value={f.standardId} disabled={!f.domainId} onChange={(e) => setF({ ...f, standardId: e.target.value })}>
            <option value="">— اختر —</option>{stds.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="الرمز"><input className={inputCls} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></Field>
        <div className="sm:col-span-2"><Field label="نص المؤشر" error={err.title}><input className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field></div>
      </div>
      <Field label="الوصف"><textarea rows={3} className={inputCls} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="المسؤولة">
          <select className={inputCls} value={f.ownerId} onChange={(e) => setF({ ...f, ownerId: e.target.value })}>
            <option value="">— غير محددة —</option>{db.users.filter((u) => u.active).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </Field>
        <Field label="تاريخ الإنجاز"><input type="date" className={inputCls} value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} /></Field>
        <Field label="الحالة">
          <select className={inputCls} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as IndicatorStatus })}>
            {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </Field>
      </div>
      <FormFooter onCancel={onClose} />
    </form>
  );
}

export default function IndicatorsPage() {
  const { db, upsert, remove, notify } = useStore();
  const user = useUser();
  const { userById, domainById, standardById } = useLookups();
  const manager = isManager(user.role);
  const [q, setQ] = useState(""); const [fd, setFd] = useState(""); const [fs, setFs] = useState(""); const [fst, setFst] = useState(""); const [fo, setFo] = useState("");
  const [edit, setEdit] = useState<Indicator | null>(null);
  const [del, setDel] = useState<Indicator | null>(null);
  const [evFor, setEvFor] = useState<string | null>(null);
  const [imp, setImp] = useState(false);

  const evCount = useMemo(() => { const m = new Map<string, number>(); db.evidence.forEach((e) => m.set(e.indicatorId, (m.get(e.indicatorId) ?? 0) + 1)); return m; }, [db.evidence]);
  const rows = db.indicators.filter((i) =>
    (!fd || i.domainId === fd) && (!fs || i.standardId === fs) && (!fst || i.status === fst) && (!fo || i.ownerId === fo) &&
    `${i.code} ${i.title} ${i.description}`.includes(q.trim()));

  const blank = (): Indicator => ({ id: uid(), domainId: fd, standardId: fs, code: "", title: "", description: "", status: "not_started", ownerId: "", dueDate: "" });

  return (
    <>
      <PageHeader title="إدارة المؤشرات" subtitle={`${rows.length} من ${db.indicators.length} مؤشر`} actions={<>
        <Button variant="secondary" onClick={() => exportIndicators(db).catch(() => notify("تعذّر تصدير الملف.", "error"))}><Download className="h-4 w-4" /> تصدير Excel</Button>
        {manager && <Button variant="secondary" onClick={() => setImp(true)}><Upload className="h-4 w-4" /> استيراد Excel</Button>}
        {manager && <Button disabled={db.standards.length === 0} onClick={() => setEdit(blank())}><Plus className="h-4 w-4" /> إضافة مؤشر</Button>}
      </>} />
      <Card>
        <div className="flex flex-wrap gap-3 p-4">
          <SearchInput value={q} onChange={setQ} placeholder="بحث في المؤشرات" />
          <select className={`${inputCls} !w-auto`} aria-label="المجال" value={fd} onChange={(e) => { setFd(e.target.value); setFs(""); }}><option value="">كل المجالات</option>{db.domains.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}</select>
          <select className={`${inputCls} !w-auto`} aria-label="المعيار" value={fs} onChange={(e) => setFs(e.target.value)}><option value="">كل المعايير</option>{db.standards.filter((s) => !fd || s.domainId === fd).map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select>
          <select className={`${inputCls} !w-auto`} aria-label="الحالة" value={fst} onChange={(e) => setFst(e.target.value)}><option value="">كل الحالات</option>{STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}</select>
          <select className={`${inputCls} !w-auto`} aria-label="المسؤولة" value={fo} onChange={(e) => setFo(e.target.value)}><option value="">كل المسؤولات</option>{db.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
        </div>
        {rows.length === 0 ? <Empty text={db.indicators.length ? "لا توجد مؤشرات مطابقة للتصفية." : "لا توجد مؤشرات. أضف مؤشرًا أو استورد ملف Excel."} /> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[900px]">
            <thead><tr><Th>الرمز</Th><Th>المؤشر</Th><Th>المجال / المعيار</Th><Th>المسؤولة</Th><Th>تاريخ الإنجاز</Th><Th>الحالة</Th><Th>الشواهد</Th><Th /></tr></thead>
            <tbody>
              {rows.map((i) => {
                const canEdit = canEditIndicator(user, i);
                const late = isOverdue(i.dueDate, i.status === "completed");
                return (
                  <tr key={i.id}>
                    <Td className="whitespace-nowrap">{i.code}</Td>
                    <Td className="min-w-[220px] font-medium">{i.title}</Td>
                    <Td className="text-xs text-navy-600">{domainById.get(i.domainId)?.title}<br />{standardById.get(i.standardId)?.title}</Td>
                    <Td>{userById.get(i.ownerId)?.name ?? <span className="text-navy-300">غير محددة</span>}</Td>
                    <Td className="whitespace-nowrap">{i.dueDate ? <span className={late ? "font-medium text-red-600" : ""}>{i.dueDate}{late && " (متأخر)"}</span> : "—"}</Td>
                    <Td>
                      {canEdit ? (
                        <select className={`${inputCls} !w-auto !py-1`} aria-label="تحديث الحالة" value={i.status}
                          onChange={(e) => { upsert("indicators", { ...i, status: e.target.value as IndicatorStatus }); notify("تم تحديث الحالة."); }}>
                          {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                        </select>
                      ) : <Badge tone={STATUS_TONE[i.status]}>{STATUS_LABELS[i.status]}</Badge>}
                    </Td>
                    <Td>{evCount.get(i.id) ?? 0}</Td>
                    <Td><div className="flex gap-1">
                      {canEdit && <Button variant="ghost" aria-label="إضافة شاهد" title="إضافة شاهد" onClick={() => setEvFor(i.id)}><FilePlus2 className="h-4 w-4" /></Button>}
                      {manager && <Button variant="ghost" aria-label="تعديل" onClick={() => setEdit(i)}><Pencil className="h-4 w-4" /></Button>}
                      {manager && <Button variant="ghost" aria-label="حذف" onClick={() => setDel(i)}><Trash2 className="h-4 w-4 text-red-600" /></Button>}
                    </div></Td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
      </Card>
      <Modal wide open={!!edit} onClose={() => setEdit(null)} title={edit && db.indicators.some((x) => x.id === edit.id) ? "تعديل مؤشر" : "إضافة مؤشر"}>
        {edit && <IndicatorForm initial={edit} onClose={() => setEdit(null)} />}
      </Modal>
      <EvidenceModal open={!!evFor} presetIndicatorId={evFor ?? ""} onClose={() => setEvFor(null)} />
      <ImportModal open={imp} onClose={() => setImp(false)} />
      <ConfirmModal open={!!del} title="حذف المؤشر" onClose={() => setDel(null)}
        message={del ? `سيتم حذف المؤشر "${del.title}" مع شواهده. لا يمكن التراجع.` : ""}
        onConfirm={() => { if (del) { remove("indicators", del.id); notify("تم حذف المؤشر."); } }} />
    </>
  );
}

"use client";
import { useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useLookups, useStore, useUser } from "@/lib/store";
import { isManager } from "@/lib/permissions";
import { Button, Card, ConfirmModal, Empty, Field, FormFooter, Modal, PageHeader, Progress, SearchInput, Td, Th, inputCls } from "@/components/ui";
import type { Standard } from "@/lib/types";
import { percent, uid } from "@/lib/utils";

function StandardForm({ initial, onClose }: { initial: Standard; onClose: () => void }) {
  const { db, upsert, notify } = useStore();
  const [f, setF] = useState(initial);
  const [err, setErr] = useState<{ domainId?: string; title?: string }>({});
  function submit(e: FormEvent) {
    e.preventDefault();
    const er: typeof err = {};
    if (!f.domainId) er.domainId = "اختر المجال";
    if (!f.title.trim()) er.title = "عنوان المعيار مطلوب";
    setErr(er);
    if (Object.keys(er).length) return;
    upsert("standards", { ...f, title: f.title.trim(), code: f.code.trim() });
    notify("تم حفظ المعيار.");
    onClose();
  }
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="المجال" error={err.domainId}>
        <select className={inputCls} value={f.domainId} onChange={(e) => setF({ ...f, domainId: e.target.value })}>
          <option value="">— اختر المجال —</option>
          {db.domains.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
        </select>
      </Field>
      <Field label="الرمز"><input className={inputCls} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></Field>
      <Field label="عنوان المعيار" error={err.title}><input className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
      <FormFooter onCancel={onClose} />
    </form>
  );
}

export default function StandardsPage() {
  const { db, remove, notify } = useStore();
  const { domainById } = useLookups();
  const manager = isManager(useUser().role);
  const [q, setQ] = useState("");
  const [fd, setFd] = useState("");
  const [edit, setEdit] = useState<Standard | null>(null);
  const [del, setDel] = useState<Standard | null>(null);
  const rows = db.standards.filter((s) => (!fd || s.domainId === fd) && `${s.code} ${s.title}`.includes(q.trim()));

  return (
    <>
      <PageHeader title="المعايير" actions={manager && (
        <Button disabled={db.domains.length === 0} onClick={() => setEdit({ id: uid(), domainId: fd, code: "", title: "" })}><Plus className="h-4 w-4" /> إضافة معيار</Button>)} />
      <Card>
        <div className="flex flex-wrap gap-3 p-4">
          <SearchInput value={q} onChange={setQ} placeholder="بحث في المعايير" />
          <select className={`${inputCls} !w-auto`} value={fd} onChange={(e) => setFd(e.target.value)} aria-label="تصفية حسب المجال">
            <option value="">كل المجالات</option>
            {db.domains.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
          </select>
        </div>
        {rows.length === 0 ? <Empty text="لا توجد معايير مطابقة." /> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[640px]">
            <thead><tr><Th>الرمز</Th><Th>المعيار</Th><Th>المجال</Th><Th>المؤشرات</Th><Th>الإنجاز</Th>{manager && <Th />}</tr></thead>
            <tbody>
              {rows.map((s) => {
                const inds = db.indicators.filter((i) => i.standardId === s.id);
                return (
                  <tr key={s.id}>
                    <Td>{s.code}</Td><Td className="font-medium">{s.title}</Td><Td>{domainById.get(s.domainId)?.title}</Td><Td>{inds.length}</Td>
                    <Td className="w-48"><Progress value={percent(inds.filter((i) => i.status === "completed").length, inds.length)} /></Td>
                    {manager && <Td><div className="flex gap-1">
                      <Button variant="ghost" aria-label="تعديل" onClick={() => setEdit(s)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" aria-label="حذف" onClick={() => setDel(s)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                    </div></Td>}
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
      </Card>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit && db.standards.some((x) => x.id === edit.id) ? "تعديل معيار" : "إضافة معيار"}>
        {edit && <StandardForm initial={edit} onClose={() => setEdit(null)} />}
      </Modal>
      <ConfirmModal open={!!del} title="حذف المعيار" onClose={() => setDel(null)}
        message={del ? `سيتم حذف المعيار "${del.title}" مع مؤشراته وشواهدها. لا يمكن التراجع.` : ""}
        onConfirm={() => { if (del) { remove("standards", del.id); notify("تم حذف المعيار وما يتبعه."); } }} />
    </>
  );
}

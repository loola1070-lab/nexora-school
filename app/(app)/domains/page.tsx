"use client";
import { useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useStore, useUser } from "@/lib/store";
import { isManager } from "@/lib/permissions";
import { Button, Card, ConfirmModal, Empty, Field, FormFooter, Modal, PageHeader, Progress, SearchInput, Td, Th, inputCls } from "@/components/ui";
import type { Domain } from "@/lib/types";
import { percent, uid } from "@/lib/utils";

function DomainForm({ initial, onClose }: { initial: Domain; onClose: () => void }) {
  const { upsert, notify } = useStore();
  const [f, setF] = useState(initial);
  const [err, setErr] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!f.title.trim()) return setErr("عنوان المجال مطلوب");
    if (!(await upsert("domains", { ...f, title: f.title.trim(), code: f.code.trim() }))) return;
    notify(initial.title ? "تم تعديل المجال." : "تمت إضافة المجال.");
    onClose();
  }
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="الرمز"><input className={inputCls} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></Field>
      <Field label="عنوان المجال" error={err}><input className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} autoFocus /></Field>
      <FormFooter onCancel={onClose} />
    </form>
  );
}

export default function DomainsPage() {
  const { db, remove, notify } = useStore();
  const manager = isManager(useUser().role);
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Domain | null>(null);
  const [del, setDel] = useState<Domain | null>(null);
  const rows = db.domains.filter((d) => `${d.code} ${d.title}`.includes(q.trim()));

  return (
    <>
      <PageHeader title="مجالات التقييم" actions={manager && <Button onClick={() => setEdit({ id: uid(), code: String(db.domains.length + 1), title: "" })}><Plus className="h-4 w-4" /> إضافة مجال</Button>} />
      <Card>
        <div className="flex gap-3 p-4"><SearchInput value={q} onChange={setQ} placeholder="بحث في المجالات" /></div>
        {rows.length === 0 ? <Empty text="لا توجد مجالات مطابقة." /> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[640px]">
            <thead><tr><Th>الرمز</Th><Th>المجال</Th><Th>المعايير</Th><Th>المؤشرات</Th><Th>الإنجاز</Th>{manager && <Th />}</tr></thead>
            <tbody>
              {rows.map((d) => {
                const inds = db.indicators.filter((i) => i.domainId === d.id);
                return (
                  <tr key={d.id}>
                    <Td>{d.code}</Td><Td className="font-medium">{d.title}</Td>
                    <Td>{db.standards.filter((s) => s.domainId === d.id).length}</Td><Td>{inds.length}</Td>
                    <Td className="w-48"><Progress value={percent(inds.filter((i) => i.status === "completed").length, inds.length)} /></Td>
                    {manager && <Td><div className="flex gap-1">
                      <Button variant="ghost" aria-label="تعديل" onClick={() => setEdit(d)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" aria-label="حذف" onClick={() => setDel(d)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                    </div></Td>}
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
      </Card>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit && db.domains.some((d) => d.id === edit.id) ? "تعديل مجال" : "إضافة مجال"}>
        {edit && <DomainForm initial={edit} onClose={() => setEdit(null)} />}
      </Modal>
      <ConfirmModal open={!!del} title="حذف المجال" onClose={() => setDel(null)}
        message={del ? `سيتم حذف المجال "${del.title}" مع جميع معاييره ومؤشراته وشواهدها. لا يمكن التراجع.` : ""}
        onConfirm={async () => { if (del && (await remove("domains", del.id))) notify("تم حذف المجال وما يتبعه."); }} />
    </>
  );
}

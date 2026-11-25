"use client";
import { useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useLookups, useStore, useUser } from "@/lib/store";
import { isManager } from "@/lib/permissions";
import { Badge, Button, Card, ConfirmModal, Empty, Field, FormFooter, Modal, PageHeader, Td, Th, inputCls } from "@/components/ui";
import type { Task } from "@/lib/types";
import { cn, isOverdue, uid } from "@/lib/utils";

function TaskForm({ initial, onClose }: { initial: Task; onClose: () => void }) {
  const { db, upsert, notify } = useStore();
  const [f, setF] = useState(initial);
  const [err, setErr] = useState<Record<string, string>>({});
  async function submit(e: FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!f.title.trim()) er.title = "عنوان المهمة مطلوب";
    if (!f.assigneeId) er.assigneeId = "حدد المسؤولة";
    setErr(er);
    if (Object.keys(er).length) return;
    if (!(await upsert("tasks", { ...f, title: f.title.trim() }))) return;
    notify("تم حفظ المهمة.");
    onClose();
  }
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="المهمة" error={err.title}><input className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
      <Field label="المؤشر المرتبط"><select className={inputCls} value={f.indicatorId} onChange={(e) => setF({ ...f, indicatorId: e.target.value })}><option value="">— بدون —</option>{db.indicators.map((i) => <option key={i.id} value={i.id}>{i.code} — {i.title}</option>)}</select></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="المسؤولة" error={err.assigneeId}><select className={inputCls} value={f.assigneeId} onChange={(e) => setF({ ...f, assigneeId: e.target.value })}><option value="">— اختر —</option>{db.users.filter((u) => u.active).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>
        <Field label="تاريخ الاستحقاق"><input type="date" className={inputCls} value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} /></Field>
      </div>
      <FormFooter onCancel={onClose} />
    </form>
  );
}

export default function TasksPage() {
  const { db, setTaskStatus, remove, notify } = useStore();
  const user = useUser();
  const manager = isManager(user.role);
  const { indicatorById, userById } = useLookups();
  const [tab, setTab] = useState<"all" | "mine" | "overdue" | "done">("all");
  const [edit, setEdit] = useState<Task | null>(null);
  const [del, setDel] = useState<Task | null>(null);

  const rows = db.tasks.filter((t) => tab === "all" || (tab === "mine" && t.assigneeId === user.id) || (tab === "done" && t.status === "done") || (tab === "overdue" && isOverdue(t.dueDate, t.status === "done")));
  const tabs = [["all", "الكل"], ["mine", "مهامي"], ["overdue", "المتأخرة"], ["done", "المنجزة"]] as const;

  return (
    <>
      <PageHeader title="المهام والمسؤوليات" actions={manager && <Button onClick={() => setEdit({ id: uid(), title: "", indicatorId: "", assigneeId: "", dueDate: "", status: "open" })}><Plus className="h-4 w-4" /> مهمة جديدة</Button>} />
      <Card>
        <div className="flex flex-wrap gap-2 p-4">
          {tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={cn("rounded-full px-4 py-1.5 text-sm", tab === k ? "bg-navy-800 text-white" : "bg-navy-50 text-navy-700 hover:bg-navy-100")}>{l}</button>)}
        </div>
        {rows.length === 0 ? <Empty text="لا توجد مهام." /> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[720px]">
            <thead><tr><Th>تم</Th><Th>المهمة</Th><Th>المؤشر</Th><Th>المسؤولة</Th><Th>الاستحقاق</Th><Th />{manager && <Th />}</tr></thead>
            <tbody>
              {rows.map((t) => {
                const done = t.status === "done"; const late = isOverdue(t.dueDate, done);
                const can = manager || t.assigneeId === user.id;
                return (
                  <tr key={t.id}>
                    <Td><input type="checkbox" className="h-4 w-4 accent-navy-800" checked={done} disabled={!can} aria-label="إنجاز المهمة"
                      onChange={async () => { if (await setTaskStatus(t.id, done ? "open" : "done")) notify(done ? "أُعيد فتح المهمة." : "تم إنجاز المهمة."); }} /></Td>
                    <Td className={cn("font-medium", done && "text-navy-400 line-through")}>{t.title}</Td>
                    <Td>{indicatorById.get(t.indicatorId)?.code ?? "—"}</Td>
                    <Td>{userById.get(t.assigneeId)?.name ?? "—"}</Td>
                    <Td className="whitespace-nowrap">{t.dueDate || "—"}</Td>
                    <Td>{late ? <Badge tone="red">متأخرة</Badge> : done ? <Badge tone="green">منجزة</Badge> : <Badge tone="blue">مفتوحة</Badge>}</Td>
                    {manager && <Td><div className="flex gap-1">
                      <Button variant="ghost" aria-label="تعديل" onClick={() => setEdit(t)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" aria-label="حذف" onClick={() => setDel(t)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                    </div></Td>}
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
      </Card>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit && db.tasks.some((t) => t.id === edit.id) ? "تعديل مهمة" : "مهمة جديدة"}>
        {edit && <TaskForm initial={edit} onClose={() => setEdit(null)} />}
      </Modal>
      <ConfirmModal open={!!del} title="حذف المهمة" message="سيتم حذف المهمة نهائيًا." onClose={() => setDel(null)} onConfirm={async () => { if (del && (await remove("tasks", del.id))) notify("تم حذف المهمة."); }} />
    </>
  );
}

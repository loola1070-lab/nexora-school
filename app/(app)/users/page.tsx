"use client";
import { useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useStore, useUser } from "@/lib/store";
import { canManageUsers } from "@/lib/permissions";
import { Badge, Button, Card, ConfirmModal, Field, FormFooter, Modal, PageHeader, Td, Th, inputCls } from "@/components/ui";
import type { AppUser, Role } from "@/lib/types";
import { ROLE_LABELS, uid } from "@/lib/utils";

function UserForm({ initial, isNew, onClose }: { initial: AppUser; isNew: boolean; onClose: () => void }) {
  const { db, upsert, notify } = useStore();
  const me = useUser();
  const [f, setF] = useState(initial);
  const [err, setErr] = useState<Record<string, string>>({});
  const roles = (Object.keys(ROLE_LABELS) as Role[]).filter((r) => me.role === "system_admin" || r !== "system_admin");
  function submit(e: FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    const email = f.email.trim().toLowerCase();
    if (!f.name.trim()) er.name = "الاسم مطلوب";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) er.email = "بريد إلكتروني غير صالح";
    else if (db.users.some((u) => u.email === email && u.id !== f.id)) er.email = "البريد مستخدم مسبقًا";
    if (f.id === me.id && (f.role !== me.role || !f.active)) er.role = "لا يمكنك تغيير صلاحيتك أو تعطيل حسابك";
    setErr(er);
    if (Object.keys(er).length) return;
    upsert("users", { ...f, name: f.name.trim(), email });
    notify(isNew ? "تمت إضافة المستخدم (حساب تجريبي محلي)." : "تم حفظ المستخدم.");
    onClose();
  }
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="الاسم" error={err.name}><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="البريد الإلكتروني" error={err.email}><input className={inputCls} dir="ltr" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
      <Field label="الصلاحية" error={err.role}><select className={inputCls} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>{roles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-navy-800" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> الحساب مفعّل</label>
      {isNew && <p className="rounded-lg bg-amber-50 p-3 text-xs leading-6 text-amber-800">هذا الحساب محلي تجريبي بكلمة المرور التجريبية. الحسابات الفعلية ودعوات البريد ستكون عبر Supabase Auth في المرحلة التالية.</p>}
      <FormFooter onCancel={onClose} />
    </form>
  );
}

const MATRIX: [string, boolean, boolean, boolean][] = [
  ["إدارة المجالات والمعايير والمؤشرات", true, true, false],
  ["تحديث حالة مؤشراتها وإضافة شواهدها", true, true, true],
  ["إنشاء المهام وخطط التحسين", true, true, false],
  ["حذف أي شاهد", true, true, false],
  ["إدارة المستخدمين وبيانات المدرسة", true, false, false],
];

export default function UsersPage() {
  const { db, remove, notify } = useStore();
  const me = useUser();
  const [edit, setEdit] = useState<AppUser | null>(null);
  const [del, setDel] = useState<AppUser | null>(null);

  if (!canManageUsers(me.role)) return <Card className="p-8 text-center text-navy-600">ليست لديك صلاحية الوصول إلى هذه الصفحة.</Card>;

  return (
    <>
      <PageHeader title="المستخدمون والصلاحيات" actions={<Button onClick={() => setEdit({ id: uid(), name: "", email: "", role: "member", active: true })}><Plus className="h-4 w-4" /> مستخدم جديد</Button>} />
      <Card>
        <div className="overflow-x-auto"><table className="w-full min-w-[640px]">
          <thead><tr><Th>الاسم</Th><Th>البريد</Th><Th>الصلاحية</Th><Th>الحالة</Th><Th /></tr></thead>
          <tbody>{db.users.map((u) => (
            <tr key={u.id}>
              <Td className="font-medium">{u.name}</Td><Td><span dir="ltr">{u.email}</span></Td><Td><Badge tone="blue">{ROLE_LABELS[u.role]}</Badge></Td>
              <Td>{u.active ? <Badge tone="green">مفعّل</Badge> : <Badge tone="slate">معطّل</Badge>}</Td>
              <Td><div className="flex gap-1">
                <Button variant="ghost" aria-label="تعديل" onClick={() => setEdit(u)}><Pencil className="h-4 w-4" /></Button>
                {u.id !== me.id && <Button variant="ghost" aria-label="حذف" onClick={() => setDel(u)}><Trash2 className="h-4 w-4 text-red-600" /></Button>}
              </div></Td>
            </tr>))}</tbody>
        </table></div>
      </Card>

      <Card className="mt-6">
        <h2 className="p-5 pb-2 font-bold text-navy-800">مصفوفة الصلاحيات</h2>
        <div className="overflow-x-auto"><table className="w-full min-w-[560px]">
          <thead><tr><Th>الإجراء</Th><Th>مديرة المدرسة</Th><Th>مشرفة</Th><Th>عضوة</Th></tr></thead>
          <tbody>{MATRIX.map(([a, ...v]) => <tr key={a}><Td>{a}</Td>{v.map((x, i) => <Td key={i}>{x ? "✓" : "—"}</Td>)}</tr>)}</tbody>
        </table></div>
        <p className="p-5 pt-3 text-xs text-navy-500">هذه الصلاحيات تُطبَّق الآن على الواجهة فقط. الحماية الفعلية تأتي من سياسات RLS عند ربط Supabase.</p>
      </Card>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit && db.users.some((u) => u.id === edit.id) ? "تعديل مستخدم" : "مستخدم جديد"}>
        {edit && <UserForm initial={edit} isNew={!db.users.some((u) => u.id === edit.id)} onClose={() => setEdit(null)} />}
      </Modal>
      <ConfirmModal open={!!del} title="حذف المستخدم" message={del ? `سيتم حذف "${del.name}" وإلغاء إسنادها من المؤشرات والمهام والخطط.` : ""} onClose={() => setDel(null)}
        onConfirm={() => { if (del) { remove("users", del.id); notify("تم حذف المستخدم."); } }} />
    </>
  );
}

"use client";
import { useState, type FormEvent } from "react";
import { Copy, KeyRound, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useStore, useUser } from "@/lib/store";
import { canManageUsers } from "@/lib/permissions";
import { Badge, Button, Card, ConfirmModal, Field, FormFooter, Modal, PageHeader, Td, Th, inputCls } from "@/components/ui";
import type { AppUser, Role } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/utils";

function UserForm({ initial, onClose }: { initial: AppUser; onClose: () => void }) {
  const { upsert, notify } = useStore();
  const me = useUser();
  const [f, setF] = useState(initial);
  const [err, setErr] = useState<Record<string, string>>({});
  const roles = (Object.keys(ROLE_LABELS) as Role[]).filter((r) => r !== "system_admin" || me.role === "system_admin");
  async function submit(e: FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!f.name.trim()) er.name = "الاسم مطلوب";
    if (f.id === me.id && (f.role !== me.role || !f.active)) er.role = "لا يمكنك تغيير صلاحيتك أو تعطيل حسابك";
    setErr(er);
    if (Object.keys(er).length) return;
    if (!(await upsert("users", { ...f, name: f.name.trim() }))) return;
    notify("تم حفظ بيانات المستخدمة.");
    onClose();
  }
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="الاسم" error={err.name}><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="البريد الإلكتروني"><input className={inputCls} dir="ltr" value={f.email} disabled /></Field>
      <Field label="الصلاحية" error={err.role}><select className={inputCls} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>{roles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-navy-800" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> الحساب مفعّل</label>
      <FormFooter onCancel={onClose} />
    </form>
  );
}

function NewUserForm({ onClose }: { onClose: () => void }) {
  const { createUser, notify } = useStore();
  const [f, setF] = useState({ name: "", email: "", password: "", role: "member" as Role });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!f.name.trim()) return setError("الاسم مطلوب.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return setError("بريد إلكتروني غير صالح.");
    if (f.password.length < 8) return setError("كلمة المرور 8 أحرف على الأقل.");
    setBusy(true); setError("");
    const err = await createUser({ ...f, name: f.name.trim() });
    setBusy(false);
    if (err) return setError(err);
    notify("تم إنشاء الحساب. سلّمي البريد وكلمة المرور للموظفة لتغييرها لاحقًا.");
    onClose();
  }
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="الاسم"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="البريد الإلكتروني"><input className={inputCls} dir="ltr" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
      <Field label="كلمة مرور مؤقتة (8 أحرف على الأقل)"><input className={inputCls} dir="ltr" type="text" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="off" /></Field>
      <Field label="الصلاحية"><select className={inputCls} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>{(["member", "supervisor", "school_admin"] as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select></Field>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <p className="text-xs leading-6 text-navy-500">يتطلب هذا الخيار إضافة SUPABASE_SERVICE_ROLE_KEY كمتغير بيئة على الخادم (Vercel) فقط. بدونه استخدمي رمز الانضمام.</p>
      <FormFooter onCancel={onClose} submitLabel="إنشاء الحساب" busy={busy} />
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
  const { db, remove, notify, joinCode, regenerateJoinCode } = useStore();
  const me = useUser();
  const [edit, setEdit] = useState<AppUser | null>(null);
  const [del, setDel] = useState<AppUser | null>(null);
  const [regen, setRegen] = useState(false);
  const [adding, setAdding] = useState(false);

  if (!canManageUsers(me.role)) return <Card className="p-8 text-center text-navy-600">ليست لديك صلاحية الوصول إلى هذه الصفحة.</Card>;

  async function copy() {
    if (!joinCode) return;
    try { await navigator.clipboard.writeText(joinCode); notify("تم نسخ الرمز."); } catch { notify("تعذّر النسخ، انسخي الرمز يدويًا.", "error"); }
  }

  return (
    <>
      <PageHeader title="المستخدمون والصلاحيات" actions={<Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> مستخدمة جديدة</Button>} />
      <Card className="mb-6 p-5">
        <div className="flex items-center gap-2 font-bold text-navy-800"><KeyRound className="h-4 w-4" /> رمز انضمام الموظفات</div>
        <p className="mt-2 text-sm leading-7 text-navy-600">شاركي الرمز مع الموظفات؛ تنشئ كل واحدة حسابها من «إنشاء حساب» ثم تختار «الانضمام برمز» وتدخل الرمز فتنضم بدور «عضوة». رقّي الصلاحية من الجدول أدناه.</p>
        {joinCode ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code dir="ltr" className="rounded-xl bg-navy-50 px-4 py-2 text-lg font-bold tracking-widest text-navy-900">{joinCode}</code>
            <Button variant="secondary" onClick={copy}><Copy className="h-4 w-4" /> نسخ</Button>
            <Button variant="secondary" onClick={() => setRegen(true)}><RefreshCw className="h-4 w-4" /> رمز جديد</Button>
          </div>
        ) : <p className="mt-3 text-sm text-amber-700">الرمز غير متاح. تأكد من تشغيل ملف المرحلة 3 في Supabase.</p>}
      </Card>

      <Card>
        <div className="overflow-x-auto"><table className="w-full min-w-[640px]">
          <thead><tr><Th>الاسم</Th><Th>البريد</Th><Th>الصلاحية</Th><Th>الحالة</Th><Th /></tr></thead>
          <tbody>{db.users.map((u) => (
            <tr key={u.id}>
              <Td className="font-medium">{u.name}</Td><Td><span dir="ltr">{u.email || "—"}</span></Td><Td><Badge tone="blue">{ROLE_LABELS[u.role]}</Badge></Td>
              <Td>{u.active ? <Badge tone="green">مفعّل</Badge> : <Badge tone="slate">معطّل</Badge>}</Td>
              <Td><div className="flex gap-1">
                <Button variant="ghost" aria-label="تعديل" onClick={() => setEdit(u)}><Pencil className="h-4 w-4" /></Button>
                {u.id !== me.id && <Button variant="ghost" aria-label="إزالة من المدرسة" onClick={() => setDel(u)}><Trash2 className="h-4 w-4 text-red-600" /></Button>}
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
        <p className="p-5 pt-3 text-xs text-navy-500">هذه الصلاحيات مفروضة في قاعدة البيانات عبر RLS، وليست في الواجهة فقط.</p>
      </Card>

      <Modal open={adding} onClose={() => setAdding(false)} title="مستخدمة جديدة"><NewUserForm onClose={() => setAdding(false)} /></Modal>
      <Modal open={!!edit} onClose={() => setEdit(null)} title="تعديل مستخدمة">{edit && <UserForm initial={edit} onClose={() => setEdit(null)} />}</Modal>
      <ConfirmModal open={!!del} title="إزالة من المدرسة"
        message={del ? `ستُزال "${del.name}" من المدرسة وتُلغى مسؤولياتها عن المؤشرات والمهام. حسابها نفسه يبقى، وتستطيع الانضمام مجددًا برمز. لتعطيل الدخول فقط استخدمي «تعطيل» من التعديل.` : ""}
        onClose={() => setDel(null)} onConfirm={async () => { if (del && (await remove("users", del.id))) notify("تمت الإزالة من المدرسة."); }} />
      <ConfirmModal open={regen} title="رمز انضمام جديد" message="سيبطل الرمز الحالي فورًا. من انضمت به سابقًا تبقى في المدرسة." onClose={() => setRegen(false)}
        onConfirm={async () => { if (await regenerateJoinCode()) notify("تم إنشاء رمز جديد."); }} />
    </>
  );
}

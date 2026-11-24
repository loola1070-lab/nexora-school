"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LogIn, FlaskConical } from "lucide-react";
import { DEMO_PASSWORD, useStore } from "@/lib/store";
import { Button, Field, inputCls } from "@/components/ui";
import { ROLE_LABELS } from "@/lib/utils";

export default function LoginPage() {
  const { ready, user, db, login } = useStore();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { if (ready && user) router.replace("/dashboard"); }, [ready, user, router]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return setError("أدخل البريد الإلكتروني وكلمة المرور.");
    if (!login(email, password)) return setError("بيانات الدخول غير صحيحة.");
    router.replace("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-navy-950 via-navy-900 to-navy-700 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center text-white">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-2xl font-extrabold">N</div>
          <h1 className="text-3xl font-extrabold tracking-wide">NEXORA School</h1>
          <p className="mt-1 text-sm text-navy-200">نظام إدارة التقييم والشواهد المدرسية</p>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-6 shadow-2xl" noValidate>
          <Field label="البريد الإلكتروني"><input className={inputCls} type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></Field>
          <Field label="كلمة المرور"><input className={inputCls} type="password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></Field>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy-800 py-2.5 font-medium text-white hover:bg-navy-700"><LogIn className="h-4 w-4" /> تسجيل الدخول</button>
        </form>
        {ready && (
          <div className="mt-4 rounded-2xl bg-white/10 p-4 text-sm text-navy-100">
            <div className="mb-2 flex items-center gap-2 font-medium text-white"><FlaskConical className="h-4 w-4" /> حسابات تجريبية (كلمة المرور: <span dir="ltr">{DEMO_PASSWORD}</span>)</div>
            <div className="flex flex-wrap gap-2">
              {db.users.filter((u) => u.active).map((u) => (
                <Button key={u.id} variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => { setEmail(u.email); setPassword(DEMO_PASSWORD); setError(""); }}>{ROLE_LABELS[u.role]}</Button>
              ))}
            </div>
            <p className="mt-3 text-xs text-navy-300">الدخول هنا تجريبي ومحلي. سيُستبدل بـ Supabase Authentication.</p>
          </div>
        )}
      </div>
    </div>
  );
}

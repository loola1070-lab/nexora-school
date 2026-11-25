"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { useStore } from "@/lib/store";
import { Field, inputCls } from "@/components/ui";
import AuthLayout from "@/components/AuthLayout";

export default function LoginPage() {
  const { status, configured, signIn } = useStore();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === "ready" || status === "no_school") router.replace("/dashboard");
    if (status === "no_profile") router.replace("/onboarding");
  }, [status, router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return setError("أدخل البريد الإلكتروني وكلمة المرور.");
    setBusy(true); setError("");
    const err = await signIn(email, password);
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <AuthLayout title="NEXORA School" subtitle="نظام إدارة التقييم والشواهد المدرسية">
      {!configured && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">إعدادات Supabase غير موجودة. أضف متغيرات البيئة ثم أعد التشغيل.</p>}
      <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-6 shadow-2xl" noValidate>
        <Field label="البريد الإلكتروني"><input className={inputCls} type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></Field>
        <Field label="كلمة المرور"><input className={inputCls} type="password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></Field>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={busy || !configured} className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy-800 py-2.5 font-medium text-white hover:bg-navy-700 disabled:bg-navy-300">
          <LogIn className="h-4 w-4" /> {busy ? "جارٍ الدخول…" : "تسجيل الدخول"}
        </button>
        <p className="text-center text-sm text-navy-600">ليس لديك حساب؟ <Link href="/register" className="font-medium text-navy-800 underline">إنشاء حساب</Link></p>
      </form>
    </AuthLayout>
  );
}

"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Field, inputCls } from "@/components/ui";
import AuthLayout from "@/components/AuthLayout";

export default function RegisterPage() {
  const { status, configured, signUp } = useStore();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (status === "ready" || status === "no_school") router.replace("/dashboard");
    if (status === "no_profile") router.replace("/onboarding");
  }, [status, router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("بريد إلكتروني غير صالح.");
    if (password.length < 8) return setError("كلمة المرور يجب ألا تقل عن 8 أحرف.");
    if (password !== confirm) return setError("كلمتا المرور غير متطابقتين.");
    setBusy(true); setError("");
    const r = await signUp(email, password);
    setBusy(false);
    if (r.error) return setError(r.error);
    if (r.needsConfirm) setSent(true); // وإلا فالجلسة بدأت وسيُحوَّل المستخدم تلقائيًا
  }

  return (
    <AuthLayout title="إنشاء حساب" subtitle="الخطوة 1: بيانات الدخول. الخطوة 2: إنشاء مدرستك أو الانضمام لمدرسة.">
      {sent ? (
        <div className="space-y-3 rounded-2xl bg-white p-6 text-sm leading-7 text-navy-700 shadow-2xl">
          <p className="font-bold text-navy-900">تم إنشاء الحساب</p>
          <p>أرسلنا رسالة تأكيد إلى <b dir="ltr">{email}</b>. افتحها لتأكيد البريد، ثم سجّل الدخول لإكمال إعداد المدرسة.</p>
          <Link href="/login" className="inline-block font-medium text-navy-800 underline">الذهاب إلى تسجيل الدخول</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-6 shadow-2xl" noValidate>
          <Field label="البريد الإلكتروني"><input className={inputCls} type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></Field>
          <Field label="كلمة المرور (8 أحرف على الأقل)"><input className={inputCls} type="password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></Field>
          <Field label="تأكيد كلمة المرور"><input className={inputCls} type="password" dir="ltr" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" /></Field>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={busy || !configured} className="w-full rounded-xl bg-navy-800 py-2.5 font-medium text-white hover:bg-navy-700 disabled:bg-navy-300">{busy ? "جارٍ الإنشاء…" : "إنشاء الحساب"}</button>
          <p className="text-center text-sm text-navy-600">لديك حساب؟ <Link href="/login" className="font-medium text-navy-800 underline">تسجيل الدخول</Link></p>
        </form>
      )}
    </AuthLayout>
  );
}

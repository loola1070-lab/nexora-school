"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Button, Field, inputCls } from "@/components/ui";
import AuthLayout from "@/components/AuthLayout";
import { cn } from "@/lib/utils";

export default function OnboardingPage() {
  const { status, authEmail, registerSchool, joinSchool, signOut, notify } = useStore();
  const router = useRouter();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [fullName, setFullName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [year, setYear] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === "anon") router.replace("/login");
    if (status === "ready") router.replace("/dashboard");
  }, [status, router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return setError("الاسم الكامل مطلوب.");
    if (mode === "create" && (!schoolName.trim() || !year.trim())) return setError("اسم المدرسة والعام الدراسي مطلوبان.");
    if (mode === "join" && !code.trim()) return setError("أدخل رمز الانضمام.");
    setBusy(true); setError("");
    const err = mode === "create" ? await registerSchool(schoolName, fullName, year) : await joinSchool(code, fullName);
    setBusy(false);
    if (err) return setError(err);
    notify(mode === "create" ? "تم إنشاء مساحة المدرسة." : "تم الانضمام للمدرسة.");
  }

  if (status !== "no_profile") return <div className="flex min-h-screen items-center justify-center text-navy-500">جارٍ التحميل…</div>;

  return (
    <AuthLayout title="إعداد الحساب" subtitle={authEmail}>
      <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-6 shadow-2xl" noValidate>
        <div className="grid grid-cols-2 gap-2">
          {([["create", "مدرسة جديدة"], ["join", "الانضمام برمز"]] as const).map(([k, l]) => (
            <button key={k} type="button" onClick={() => { setMode(k); setError(""); }}
              className={cn("rounded-xl border px-3 py-2 text-sm", mode === k ? "border-navy-700 bg-navy-800 text-white" : "border-navy-200 text-navy-700")}>{l}</button>
          ))}
        </div>
        <Field label="الاسم الكامل"><input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} /></Field>
        {mode === "create" ? (<>
          <Field label="اسم المدرسة"><input className={inputCls} value={schoolName} onChange={(e) => setSchoolName(e.target.value)} /></Field>
          <Field label="العام الدراسي"><input className={inputCls} value={year} onChange={(e) => setYear(e.target.value)} placeholder="1447-1448" /></Field>
          <p className="text-xs leading-6 text-navy-500">ستكونين مديرة المدرسة ولكِ مساحة بيانات مستقلة تمامًا.</p>
        </>) : (<>
          <Field label="رمز الانضمام"><input className={inputCls} dir="ltr" value={code} onChange={(e) => setCode(e.target.value)} /></Field>
          <p className="text-xs leading-6 text-navy-500">تحصلين على الرمز من مديرة المدرسة (صفحة المستخدمين). ستنضمين بدور «عضوة».</p>
        </>)}
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={busy} className="w-full rounded-xl bg-navy-800 py-2.5 font-medium text-white hover:bg-navy-700 disabled:bg-navy-300">{busy ? "جارٍ الحفظ…" : mode === "create" ? "إنشاء المدرسة" : "انضمام"}</button>
        <div className="text-center"><Button variant="ghost" onClick={() => signOut()}>تسجيل الخروج</Button></div>
      </form>
    </AuthLayout>
  );
}

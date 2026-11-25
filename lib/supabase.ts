import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && key);

// المفتاح العام (anon/publishable) آمن في المتصفح لأن الحماية الفعلية عبر RLS.
// لا تضع مفتاح service_role هنا أبدًا.
export const supabase = createClient(url ?? "http://localhost:54321", key ?? "missing-key", {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export const EVIDENCE_BUCKET = "evidence";

export function explain(e: unknown): string {
  const err = (e ?? {}) as { code?: string; message?: string; statusCode?: string | number };
  const code = err.code ?? "";
  const msg = err.message ?? (typeof e === "string" ? e : "");
  if (["PGRST202", "PGRST204", "PGRST205", "42703", "42P01", "42883"].includes(code))
    return "قاعدة البيانات غير محدّثة: شغّل ملف supabase/phase3_migration.sql في Supabase SQL Editor.";
  if (code === "42501" || /row-level security|permission denied/i.test(msg)) return "ليست لديك صلاحية لتنفيذ هذا الإجراء.";
  if (code === "23503") return "لا يمكن إتمام العملية لارتباط السجل ببيانات أخرى.";
  if (code === "23505") return "السجل موجود مسبقًا.";
  if (code === "23514") return "البيانات لا تحقق شروط القبول في قاعدة البيانات.";
  if (code === "P0001" && msg) return msg;
  if (/exceeded|too large|payload/i.test(msg) || String(err.statusCode) === "413") return "حجم الملف يتجاوز الحد المسموح.";
  if (/mime type/i.test(msg)) return "نوع الملف غير مسموح.";
  if (/failed to fetch|network|load failed/i.test(msg)) return "تعذّر الاتصال بالخادم. تحقق من الإنترنت.";
  if (/jwt|token/i.test(msg)) return "انتهت الجلسة. سجّل الدخول من جديد.";
  return msg ? `حدث خطأ: ${msg}` : "حدث خطأ غير متوقع.";
}

export function authMessage(e: { message?: string; code?: string }): string {
  const m = e.message ?? "";
  if (/invalid login credentials/i.test(m)) return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
  if (/email not confirmed/i.test(m)) return "لم يتم تأكيد البريد بعد. افتح رسالة التأكيد المرسلة إلى بريدك.";
  if (/already registered|already been registered/i.test(m)) return "هذا البريد مسجّل مسبقًا. جرّب تسجيل الدخول.";
  if (/password/i.test(m) && /(short|least|weak)/i.test(m)) return "كلمة المرور ضعيفة أو قصيرة (8 أحرف على الأقل).";
  if (/rate limit|too many/i.test(m) || e.code === "over_email_send_rate_limit") return "محاولات كثيرة. انتظر قليلًا ثم أعد المحاولة.";
  return explain(e);
}

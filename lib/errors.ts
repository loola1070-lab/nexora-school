export function friendly(e: unknown): string {
  const o = (e && typeof e === "object" ? e : {}) as { message?: string; code?: string };
  const msg = o.message ?? String(e ?? "");
  if (o.code === "42501" || /row-level security|permission denied/i.test(msg)) return "ليست لديك صلاحية لتنفيذ هذا الإجراء.";
  if (o.code === "23505") return "القيمة موجودة مسبقًا.";
  if (o.code === "23503") return "لا يمكن إتمام العملية لارتباطها ببيانات أخرى.";
  if (o.code === "23514") return "بيانات غير صالحة (مثل حجم الملف أو نوعه).";
  if (/Invalid login credentials/i.test(msg)) return "بيانات الدخول غير صحيحة.";
  if (/Email not confirmed/i.test(msg)) return "لم يتم تأكيد البريد الإلكتروني بعد. افحص بريدك.";
  if (/already registered|already been registered/i.test(msg)) return "هذا البريد مسجل مسبقًا.";
  if (/Password should be|weak password/i.test(msg)) return "كلمة المرور ضعيفة (8 أحرف على الأقل).";
  if (/rate limit|too many/i.test(msg)) return "محاولات كثيرة. انتظر قليلًا ثم أعد المحاولة.";
  if (/Failed to fetch|NetworkError|network/i.test(msg)) return "تعذّر الاتصال بالخادم. تحقق من الإنترنت.";
  if (/mime type|not allowed|invalid_mime/i.test(msg)) return "نوع الملف غير مسموح.";
  if (/exceeded|too large|maximum allowed size/i.test(msg)) return "حجم الملف يتجاوز الحد المسموح.";
  return msg || "حدث خطأ غير متوقع.";
}

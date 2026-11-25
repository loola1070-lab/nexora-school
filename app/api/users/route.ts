import { NextResponse, type NextRequest } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROLES = ["school_admin", "supervisor", "member"];
const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

function adminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY; // سري: للخادم فقط
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// يتحقق أن الطالب مديرة مدرسة فعّالة ويعيد مدرستها
async function requireSchoolAdmin(req: NextRequest, sb: SupabaseClient) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: p } = await sb.from("profiles").select("id, school_id, role, is_active").eq("id", data.user.id).maybeSingle();
  if (!p || !p.is_active || p.role !== "school_admin" || !p.school_id) return null;
  return { id: p.id as string, schoolId: p.school_id as string };
}

export async function POST(req: NextRequest) {
  const sb = adminClient();
  if (!sb) return fail("إضافة المستخدمين غير مفعّلة: أضف SUPABASE_SERVICE_ROLE_KEY في متغيرات البيئة على Vercel ثم أعد النشر.", 503);
  const me = await requireSchoolAdmin(req, sb);
  if (!me) return fail("غير مصرح. هذا الإجراء لمديرة المدرسة فقط.", 403);

  const b = (await req.json().catch(() => null)) as { name?: string; email?: string; password?: string; role?: string } | null;
  const name = b?.name?.trim() ?? "";
  const email = b?.email?.trim().toLowerCase() ?? "";
  const password = b?.password ?? "";
  const role = b?.role ?? "";
  if (!name) return fail("الاسم مطلوب.", 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("بريد إلكتروني غير صالح.", 400);
  if (password.length < 8) return fail("كلمة المرور 8 أحرف على الأقل.", 400);
  if (!ROLES.includes(role)) return fail("صلاحية غير صالحة.", 400);

  const created = await sb.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) {
    const m = created.error?.message ?? "";
    return fail(/already|registered|exists/i.test(m) ? "هذا البريد مسجل مسبقًا." : "تعذّر إنشاء الحساب.", 400);
  }
  const { error } = await sb.from("profiles").insert({ id: created.data.user.id, school_id: me.schoolId, full_name: name, role, email, is_active: true });
  if (error) {
    await sb.auth.admin.deleteUser(created.data.user.id);
    return fail("تعذّر إنشاء ملف المستخدم.", 500);
  }
  return NextResponse.json({ ok: true, id: created.data.user.id });
}

export async function DELETE(req: NextRequest) {
  const sb = adminClient();
  if (!sb) return fail("حذف المستخدمين غير مفعّل: أضف SUPABASE_SERVICE_ROLE_KEY في Vercel.", 503);
  const me = await requireSchoolAdmin(req, sb);
  if (!me) return fail("غير مصرح. هذا الإجراء لمديرة المدرسة فقط.", 403);

  const b = (await req.json().catch(() => null)) as { id?: string } | null;
  const id = b?.id ?? "";
  if (!id) return fail("معرّف المستخدم مطلوب.", 400);
  if (id === me.id) return fail("لا يمكنك حذف حسابك.", 400);
  const { data: target } = await sb.from("profiles").select("school_id").eq("id", id).maybeSingle();
  if (!target || target.school_id !== me.schoolId) return fail("المستخدم غير موجود في مدرستك.", 404);

  const { error } = await sb.auth.admin.deleteUser(id); // يحذف الملف تلقائيًا (cascade)
  if (error) return fail("تعذّر حذف المستخدم.", 500);
  return NextResponse.json({ ok: true });
}

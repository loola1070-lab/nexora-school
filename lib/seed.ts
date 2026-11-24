import type { DB, Indicator, IndicatorStatus } from "./types";
import { addDays } from "./utils";

export function emptyDB(): DB {
  return {
    school: { name: "", city: "", stage: "", year: "", principal: "", isDemo: true },
    users: [], domains: [], standards: [], indicators: [], evidence: [], tasks: [], plans: [],
  };
}

// بيانات تجريبية مميزة (DEMO) — ليست بيانات حقيقية.
export function seedDB(): DB {
  const ind = (n: number, d: string, s: string, title: string, status: IndicatorStatus, owner: string, due: number): Indicator => ({
    id: `i${n}`, domainId: d, standardId: s, code: `DEMO-${n}`, title,
    description: `وصف تجريبي للمؤشر رقم ${n}.`, status, ownerId: owner, dueDate: addDays(due),
  });
  return {
    school: { name: "مدرسة النموذج التجريبية (DEMO)", city: "مدينة تجريبية", stage: "ابتدائي", year: "1447-1448", principal: "مديرة تجريبية", isDemo: true },
    users: [
      { id: "u1", name: "مديرة المدرسة (تجريبي)", email: "admin@demo.nexora.test", role: "school_admin", active: true },
      { id: "u2", name: "مشرفة (تجريبي)", email: "supervisor@demo.nexora.test", role: "supervisor", active: true },
      { id: "u3", name: "عضوة (تجريبي)", email: "member@demo.nexora.test", role: "member", active: true },
      { id: "u4", name: "مدير النظام (تجريبي)", email: "sysadmin@demo.nexora.test", role: "system_admin", active: true },
    ],
    domains: [
      { id: "d1", code: "1", title: "القيادة المدرسية" },
      { id: "d2", code: "2", title: "التعليم والتعلم" },
      { id: "d3", code: "3", title: "البيئة المدرسية" },
      { id: "d4", code: "4", title: "الشراكة المجتمعية" },
    ],
    standards: [
      { id: "s1", domainId: "d1", code: "1-1", title: "التخطيط الاستراتيجي" },
      { id: "s2", domainId: "d1", code: "1-2", title: "إدارة الموارد" },
      { id: "s3", domainId: "d2", code: "2-1", title: "جودة التدريس" },
      { id: "s4", domainId: "d2", code: "2-2", title: "تقويم الطلبة" },
      { id: "s5", domainId: "d3", code: "3-1", title: "السلامة والأمان" },
      { id: "s6", domainId: "d4", code: "4-1", title: "التواصل مع أولياء الأمور" },
    ],
    indicators: [
      ind(1, "d1", "s1", "وجود خطة تشغيلية معتمدة للعام الدراسي", "completed", "u3", -20),
      ind(2, "d1", "s1", "مشاركة الكادر في إعداد الخطة", "completed", "u3", -10),
      ind(3, "d1", "s2", "توثيق ميزانية التشغيل ومتابعتها", "in_progress", "u2", 10),
      ind(4, "d1", "s2", "جرد الأصول والتجهيزات", "not_started", "u3", 25),
      ind(5, "d2", "s3", "تنفيذ زيارات صفية تبادلية", "in_progress", "u3", 7),
      ind(6, "d2", "s3", "تطبيق استراتيجيات التعلم النشط", "needs_review", "u3", -3),
      ind(7, "d2", "s4", "تحليل نتائج الاختبارات الدورية", "completed", "u2", -15),
      ind(8, "d2", "s4", "خطط علاجية للطلبة المتعثرين", "in_progress", "u3", 14),
      ind(9, "d3", "s5", "تنفيذ تجارب الإخلاء الدورية", "completed", "u2", -30),
      ind(10, "d3", "s5", "صيانة مرافق السلامة", "not_started", "u3", 30),
      ind(11, "d4", "s6", "عقد لقاءات دورية مع أولياء الأمور", "in_progress", "u2", 5),
      ind(12, "d4", "s6", "قياس رضا أولياء الأمور", "not_started", "u3", 40),
    ],
    evidence: [
      { id: "e1", indicatorId: "i1", kind: "link", category: "تقرير", description: "رابط تجريبي للخطة التشغيلية", url: "https://example.com/demo-plan", uploadedBy: "u3", createdAt: addDays(-18) },
      { id: "e2", indicatorId: "i7", kind: "link", category: "تقرير", description: "رابط تجريبي لتحليل النتائج", url: "https://example.com/demo-results", uploadedBy: "u2", createdAt: addDays(-12) },
      { id: "e3", indicatorId: "i9", kind: "link", category: "محضر", description: "رابط تجريبي لمحضر تجربة الإخلاء", url: "https://example.com/demo-drill", uploadedBy: "u2", createdAt: addDays(-28) },
    ],
    tasks: [
      { id: "t1", title: "مراجعة شواهد التعلم النشط", indicatorId: "i6", assigneeId: "u3", dueDate: addDays(-2), status: "open" },
      { id: "t2", title: "إعداد جدول الزيارات الصفية", indicatorId: "i5", assigneeId: "u3", dueDate: addDays(6), status: "open" },
      { id: "t3", title: "جمع ملفات الميزانية", indicatorId: "i3", assigneeId: "u2", dueDate: addDays(-6), status: "open" },
      { id: "t4", title: "إرسال دعوات اللقاء الدوري", indicatorId: "i11", assigneeId: "u2", dueDate: addDays(-1), status: "done" },
    ],
    plans: [
      { id: "p1", title: "رفع جودة التعلم النشط", indicatorId: "i6", goal: "زيادة تطبيق الاستراتيجيات في الصفوف", actions: "ورش تدريب شهرية\nزيارات متابعة", ownerId: "u2", startDate: addDays(-10), endDate: addDays(60), status: "active" },
      { id: "p2", title: "تحسين التواصل مع أولياء الأمور", indicatorId: "i12", goal: "رفع نسبة المشاركة", actions: "استبيان رضا\nقناة تواصل موحّدة", ownerId: "u1", startDate: addDays(10), endDate: addDays(90), status: "draft" },
    ],
  };
}

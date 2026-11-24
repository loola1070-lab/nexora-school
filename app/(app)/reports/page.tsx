"use client";
import { Download, Printer } from "lucide-react";
import { useLookups, useStore } from "@/lib/store";
import { Badge, Button, Card, Empty, PageHeader, Progress, StatCard, Td, Th } from "@/components/ui";
import { exportIndicators } from "@/lib/excel";
import { STATUS_LABELS, STATUS_TONE, isOverdue, percent, todayISO } from "@/lib/utils";
import { CheckCircle2, FolderOpen, Gauge, Target } from "lucide-react";

export default function ReportsPage() {
  const { db, notify } = useStore();
  const { userById, domainById } = useLookups();
  const done = db.indicators.filter((i) => i.status === "completed").length;
  const pending = db.indicators.filter((i) => i.status !== "completed");
  const overdueTasks = db.tasks.filter((t) => isOverdue(t.dueDate, t.status === "done"));

  return (
    <>
      <PageHeader title="التقارير والإحصائيات" subtitle="للحصول على PDF: اضغط طباعة ثم اختر «حفظ بصيغة PDF» من نافذة الطباعة." actions={<>
        <Button variant="secondary" onClick={() => exportIndicators(db).catch(() => notify("تعذّر تصدير الملف.", "error"))}><Download className="h-4 w-4" /> تصدير Excel</Button>
        <Button onClick={() => window.print()}><Printer className="h-4 w-4" /> طباعة / حفظ PDF</Button>
      </>} />

      <div className="mb-6 hidden border-b border-navy-200 pb-4 print:block">
        <div className="text-xl font-extrabold">NEXORA School — تقرير الإنجاز</div>
        <div className="text-sm">{db.school.name} · العام الدراسي {db.school.year} · تاريخ التقرير {todayISO()}</div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="إجمالي المؤشرات" value={db.indicators.length} icon={Target} />
        <StatCard label="المكتملة" value={done} icon={CheckCircle2} tone="green" />
        <StatCard label="نسبة الإنجاز" value={`${percent(done, db.indicators.length)}%`} icon={Gauge} tone="green" />
        <StatCard label="الشواهد" value={db.evidence.length} icon={FolderOpen} />
      </div>

      <Card className="mt-6">
        <h2 className="p-5 pb-2 font-bold text-navy-800">الإنجاز حسب المجال</h2>
        {db.domains.length === 0 ? <Empty text="لا توجد بيانات." /> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[640px]">
            <thead><tr><Th>المجال</Th><Th>المؤشرات</Th><Th>مكتمل</Th><Th>قيد العمل</Th><Th>لم يبدأ</Th><Th>يحتاج مراجعة</Th><Th>الإنجاز</Th></tr></thead>
            <tbody>
              {db.domains.map((d) => {
                const inds = db.indicators.filter((i) => i.domainId === d.id);
                const c = (s: string) => inds.filter((i) => i.status === s).length;
                return (
                  <tr key={d.id}><Td className="font-medium">{d.title}</Td><Td>{inds.length}</Td><Td>{c("completed")}</Td><Td>{c("in_progress")}</Td><Td>{c("not_started")}</Td><Td>{c("needs_review")}</Td>
                    <Td className="w-44"><Progress value={percent(c("completed"), inds.length)} /></Td></tr>
                );
              })}
            </tbody>
          </table></div>
        )}
      </Card>

      <Card className="mt-6">
        <h2 className="p-5 pb-2 font-bold text-navy-800">المؤشرات غير المكتملة ({pending.length})</h2>
        {pending.length === 0 ? <Empty text="جميع المؤشرات مكتملة." /> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[680px]">
            <thead><tr><Th>الرمز</Th><Th>المؤشر</Th><Th>المجال</Th><Th>المسؤولة</Th><Th>الاستحقاق</Th><Th>الحالة</Th></tr></thead>
            <tbody>{pending.map((i) => (
              <tr key={i.id}><Td>{i.code}</Td><Td>{i.title}</Td><Td>{domainById.get(i.domainId)?.title}</Td><Td>{userById.get(i.ownerId)?.name ?? "—"}</Td>
                <Td className={isOverdue(i.dueDate, false) ? "text-red-600" : ""}>{i.dueDate || "—"}</Td><Td><Badge tone={STATUS_TONE[i.status]}>{STATUS_LABELS[i.status]}</Badge></Td></tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>

      <Card className="mt-6 p-5">
        <h2 className="mb-2 font-bold text-navy-800">المهام المتأخرة ({overdueTasks.length})</h2>
        {overdueTasks.length === 0 ? <Empty text="لا توجد مهام متأخرة." /> : (
          <ul className="list-disc space-y-1 ps-5 text-sm">{overdueTasks.map((t) => <li key={t.id}>{t.title} — {userById.get(t.assigneeId)?.name ?? "غير محددة"} (استحقاق {t.dueDate})</li>)}</ul>
        )}
      </Card>
    </>
  );
}

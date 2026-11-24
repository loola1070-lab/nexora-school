"use client";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlarmClock, CheckCircle2, CircleDashed, FolderOpen, Gauge, Layers, ListChecks, Loader2, Target, AlertCircle } from "lucide-react";
import { useLookups, useStore } from "@/lib/store";
import { Badge, Card, Empty, PageHeader, StatCard } from "@/components/ui";
import { STATUS_HEX, STATUS_LABELS, STATUS_ORDER, isOverdue, percent } from "@/lib/utils";

export default function DashboardPage() {
  const { db } = useStore();
  const { userById, indicatorById } = useLookups();

  const s = useMemo(() => {
    const count = (st: string) => db.indicators.filter((i) => i.status === st).length;
    const total = db.indicators.length;
    return {
      total, completed: count("completed"), inProgress: count("in_progress"), notStarted: count("not_started"),
      review: count("needs_review"), overall: percent(count("completed"), total),
      overdue: db.tasks.filter((t) => isOverdue(t.dueDate, t.status === "done")),
    };
  }, [db]);

  const perDomain = db.domains.map((d) => {
    const inds = db.indicators.filter((i) => i.domainId === d.id);
    return { name: d.title.length > 16 ? d.title.slice(0, 15) + "…" : d.title, progress: percent(inds.filter((i) => i.status === "completed").length, inds.length) };
  });
  const pie = STATUS_ORDER.map((k) => ({ key: k, name: STATUS_LABELS[k], value: db.indicators.filter((i) => i.status === k).length }));

  return (
    <>
      <PageHeader title="لوحة التحكم" subtitle="نظرة شاملة على إنجاز مؤشرات التقييم (محسوبة من البيانات الحالية)" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="مجالات التقييم" value={db.domains.length} icon={Layers} />
        <StatCard label="المعايير" value={db.standards.length} icon={ListChecks} />
        <StatCard label="إجمالي المؤشرات" value={s.total} icon={Target} />
        <StatCard label="نسبة الإنجاز الإجمالية" value={`${s.overall}%`} icon={Gauge} tone="green" />
        <StatCard label="مؤشرات مكتملة" value={s.completed} icon={CheckCircle2} tone="green" />
        <StatCard label="مؤشرات قيد العمل" value={s.inProgress} icon={Loader2} />
        <StatCard label="مؤشرات لم تبدأ" value={s.notStarted} icon={CircleDashed} tone="slate" />
        <StatCard label="الشواهد المضافة" value={db.evidence.length} icon={FolderOpen} />
        <StatCard label="يحتاج إلى مراجعة" value={s.review} icon={AlertCircle} tone="amber" />
        <StatCard label="المهام المتأخرة" value={s.overdue.length} icon={AlarmClock} tone={s.overdue.length ? "red" : "slate"} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-4 font-bold text-navy-800">الإنجاز حسب المجال (%)</h2>
          {perDomain.length === 0 ? <Empty text="لا توجد مجالات بعد." /> : (
            <div className="h-72" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perDomain} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e1eaf6" vertical={false} />
                  <XAxis dataKey="name" reversed tick={{ fontSize: 12, fill: "#385b92" }} />
                  <YAxis orientation="right" domain={[0, 100]} unit="%" tick={{ fontSize: 12, fill: "#385b92" }} />
                  <Tooltip formatter={(v: number) => [`${v}%`, "الإنجاز"]} />
                  <Bar dataKey="progress" fill="#2d4a77" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="mb-4 font-bold text-navy-800">توزيع الحالات</h2>
          {s.total === 0 ? <Empty text="لا توجد مؤشرات بعد." /> : (
            <>
              <div className="h-48" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pie} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                      {pie.map((p) => <Cell key={p.key} fill={STATUS_HEX[p.key]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-3 space-y-1.5 text-sm">
                {pie.map((p) => (
                  <li key={p.key} className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: STATUS_HEX[p.key] }} />{p.name}</span>
                    <span className="font-medium">{p.value}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      <Card className="mt-6 p-5">
        <h2 className="mb-3 font-bold text-navy-800">المهام المتأخرة</h2>
        {s.overdue.length === 0 ? <Empty text="لا توجد مهام متأخرة." /> : (
          <ul className="divide-y divide-navy-100">
            {s.overdue.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <div className="font-medium">{t.title}</div>
                  <div className="text-xs text-navy-500">{indicatorById.get(t.indicatorId)?.code ?? "بلا مؤشر"} · {userById.get(t.assigneeId)?.name ?? "غير محدد"}</div>
                </div>
                <Badge tone="red">استحقاق {t.dueDate}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

"use client";
import { useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button, Modal } from "./ui";
import { downloadTemplate, importIndicatorsFile, type ImportReport } from "@/lib/excel";

function ImportBody({ onClose }: { onClose: () => void }) {
  const { db, applyImport, notify } = useStore();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<ImportReport | null>(null);

  async function run() {
    if (!file) return setError("اختر ملف Excel أولًا.");
    setBusy(true); setError("");
    try {
      const out = await importIndicatorsFile(file, db);
      const rep = out.report;
      if (rep.added > 0 && !(await applyImport(out.db))) return;
      setReport(rep);
      notify(rep.added ? `تم استيراد ${rep.added} مؤشر.` : "لم يُستورد أي مؤشر.", rep.added ? "success" : "error");
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل الاستيراد.");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4 text-sm">
      <p className="leading-7 text-navy-600">الأعمدة المطلوبة: <b>المجال، المعيار، المؤشر</b>. أما الباقي (الرمز، الوصف، المسؤولة، تاريخ الإنجاز بصيغة YYYY-MM-DD، الحالة) فاختياري. المجالات والمعايير غير الموجودة تُنشأ تلقائيًا.</p>
      <Button variant="secondary" onClick={() => downloadTemplate()}><Download className="h-4 w-4" /> تنزيل القالب</Button>
      <input type="file" accept=".xlsx,.xls" className="block w-full rounded-xl border border-navy-200 p-2" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setReport(null); setError(""); }} />
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-red-700">{error}</p>}
      {report && (
        <div className="space-y-2 rounded-xl bg-navy-50 p-3">
          <div>أُضيف <b>{report.added}</b> مؤشر · مجالات جديدة <b>{report.newDomains}</b> · معايير جديدة <b>{report.newStandards}</b> · تم تخطي <b>{report.skipped.length}</b></div>
          {report.skipped.length > 0 && <ul className="max-h-32 list-disc space-y-1 overflow-y-auto ps-5 text-red-700">{report.skipped.map((s, i) => <li key={i}>الصف {s.row}: {s.reason}</li>)}</ul>}
          {report.warnings.length > 0 && <ul className="max-h-32 list-disc space-y-1 overflow-y-auto ps-5 text-amber-700">{report.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>إغلاق</Button>
        <Button onClick={run} disabled={busy || !file}><FileSpreadsheet className="h-4 w-4" /> {busy ? "جارٍ الاستيراد…" : "استيراد"}</Button>
      </div>
    </div>
  );
}

export default function ImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <Modal open={open} onClose={onClose} title="استيراد المؤشرات من Excel"><ImportBody onClose={onClose} /></Modal>;
}

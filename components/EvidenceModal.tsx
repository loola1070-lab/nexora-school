"use client";
import { useState, type FormEvent } from "react";
import { Link2, Upload } from "lucide-react";
import { useStore, useUser } from "@/lib/store";
import { canEditIndicator } from "@/lib/permissions";
import { Field, FormFooter, Modal, inputCls } from "./ui";
import { EVIDENCE_CATEGORIES, formatBytes, todayISO, uid } from "@/lib/utils";

export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const EXT_MIME: Record<string, string> = {
  pdf: "application/pdf", doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp",
};
export const ALLOWED_EXT = ["pdf", "doc", "docx", "xls", "xlsx", "png", "jpg", "jpeg", "webp"];

function EvidenceForm({ presetIndicatorId, onClose }: { presetIndicatorId: string; onClose: () => void }) {
  const { db, addEvidence, notify } = useStore();
  const user = useUser();
  const allowed = db.indicators.filter((i) => canEditIndicator(user, i));
  const [indicatorId, setIndicatorId] = useState(presetIndicatorId);
  const [kind, setKind] = useState<"file" | "link">("file");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState(EVIDENCE_CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [createdAt, setCreatedAt] = useState(todayISO());
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function pick(f: File | null) {
    setFile(null);
    if (!f) return;
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXT.includes(ext)) return setErr({ file: "نوع الملف غير مسموح. المسموح: PDF وWord وExcel والصور." });
    if (f.size > MAX_FILE_BYTES) return setErr({ file: "حجم الملف يتجاوز 20MB." });
    if (f.size === 0) return setErr({ file: "الملف فارغ." });
    setErr({}); setFile(f);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!indicatorId) er.indicator = "اختر المؤشر";
    if (kind === "file" && !file) er.file = err.file || "اختر ملفًا";
    if (kind === "link") {
      try { const u = new URL(url.trim()); if (!/^https?:$/.test(u.protocol)) throw 0; } catch { er.url = "أدخل رابطًا صحيحًا يبدأ بـ http أو https"; }
    }
    if (!description.trim()) er.description = "وصف الشاهد مطلوب";
    setErr(er);
    if (Object.keys(er).length) return;

    const id = uid();
    const base = { id, indicatorId, category, description: description.trim(), uploadedBy: user.id, createdAt };
    setBusy(true);
    const ok = kind === "file" && file
      ? await addEvidence({ ...base, kind: "file", fileName: file.name, mime: file.type || EXT_MIME[file.name.split(".").pop()!.toLowerCase()] || "", size: file.size }, file)
      : await addEvidence({ ...base, kind: "link", url: url.trim() });
    setBusy(false);
    if (!ok) return;
    notify("تمت إضافة الشاهد وحُفظ في قاعدة البيانات.");
    onClose();
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="المؤشر" error={err.indicator}>
        <select className={inputCls} value={indicatorId} onChange={(e) => setIndicatorId(e.target.value)}>
          <option value="">— اختر المؤشر —</option>
          {allowed.map((i) => <option key={i.id} value={i.id}>{i.code} — {i.title}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        {(["file", "link"] as const).map((k) => (
          <button key={k} type="button" onClick={() => setKind(k)}
            className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm ${kind === k ? "border-navy-700 bg-navy-800 text-white" : "border-navy-200 bg-white text-navy-700"}`}>
            {k === "file" ? <Upload className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}{k === "file" ? "رفع ملف" : "رابط خارجي"}
          </button>
        ))}
      </div>
      {kind === "file" ? (
        <Field label="الملف (PDF / Word / Excel / صورة — حتى 20MB)" error={err.file}>
          <input type="file" className={inputCls} accept={ALLOWED_EXT.map((x) => "." + x).join(",")} onChange={(e) => pick(e.target.files?.[0] ?? null)} />
          {file && <span className="mt-1 block text-xs text-navy-500">{file.name} · {formatBytes(file.size)}</span>}
        </Field>
      ) : (
        <Field label="الرابط" error={err.url}><input className={inputCls} dir="ltr" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" /></Field>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="نوع الشاهد"><select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>{EVIDENCE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="تاريخ الإضافة"><input type="date" className={inputCls} value={createdAt} onChange={(e) => setCreatedAt(e.target.value)} /></Field>
      </div>
      <Field label="وصف الشاهد" error={err.description}><textarea rows={3} className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      <FormFooter onCancel={onClose} submitLabel="إضافة الشاهد" busy={busy} />
    </form>
  );
}

export default function EvidenceModal({ open, onClose, presetIndicatorId = "" }: { open: boolean; onClose: () => void; presetIndicatorId?: string }) {
  return <Modal open={open} onClose={onClose} title="إضافة شاهد"><EvidenceForm presetIndicatorId={presetIndicatorId} onClose={onClose} /></Modal>;
}

import type { DB, IndicatorStatus } from "./types";
import { STATUS_LABELS, toISO, todayISO, uid } from "./utils";

const H = {
  code: "رمز المؤشر", domain: "المجال", standard: "المعيار", title: "المؤشر",
  description: "الوصف", owner: "المسؤولة", due: "تاريخ الإنجاز", status: "الحالة",
} as const;
const HEADERS = Object.values(H);
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 2000;

export interface ImportReport { added: number; newDomains: number; newStandards: number; skipped: { row: number; reason: string }[]; warnings: string[] }

export async function exportIndicators(db: DB) {
  const XLSX = await import("xlsx");
  const rows = db.indicators.map((i) => ({
    [H.code]: i.code,
    [H.domain]: db.domains.find((d) => d.id === i.domainId)?.title ?? "",
    [H.standard]: db.standards.find((s) => s.id === i.standardId)?.title ?? "",
    [H.title]: i.title,
    [H.description]: i.description,
    [H.owner]: db.users.find((u) => u.id === i.ownerId)?.name ?? "",
    [H.due]: i.dueDate,
    [H.status]: STATUS_LABELS[i.status],
  }));
  const ws = XLSX.utils.json_to_sheet(rows, { header: [...HEADERS] });
  ws["!cols"] = HEADERS.map(() => ({ wch: 24 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "المؤشرات");
  wb.Workbook = { Views: [{ RTL: true }] };
  XLSX.writeFile(wb, `nexora-indicators-${todayISO()}.xlsx`);
}

export async function downloadTemplate() {
  const XLSX = await import("xlsx");
  const example = {
    [H.code]: "مثال-1", [H.domain]: "القيادة المدرسية", [H.standard]: "التخطيط الاستراتيجي",
    [H.title]: "مؤشر مثال (احذف هذا الصف)", [H.description]: "وصف اختياري", [H.owner]: "",
    [H.due]: todayISO(), [H.status]: STATUS_LABELS.not_started,
  };
  const ws = XLSX.utils.json_to_sheet([example], { header: [...HEADERS] });
  ws["!cols"] = HEADERS.map(() => ({ wch: 24 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "المؤشرات");
  wb.Workbook = { Views: [{ RTL: true }] };
  XLSX.writeFile(wb, "nexora-indicators-template.xlsx");
}

const s = (v: unknown) => String(v ?? "").trim();
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export async function importIndicatorsFile(file: File, db: DB): Promise<{ db: DB; report: ImportReport }> {
  if (!/\.(xlsx|xls)$/i.test(file.name)) throw new Error("نوع الملف غير مدعوم. استخدم ملف Excel بصيغة xlsx أو xls.");
  if (file.size > MAX_BYTES) throw new Error("حجم الملف أكبر من 5MB.");

  const XLSX = await import("xlsx");
  let rows: Record<string, unknown>[];
  try {
    const wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
  } catch {
    throw new Error("تعذّرت قراءة الملف. تأكد أنه ملف Excel سليم.");
  }
  if (rows.length === 0) throw new Error("الملف لا يحتوي على صفوف.");
  if (rows.length > MAX_ROWS) throw new Error(`عدد الصفوف يتجاوز الحد المسموح (${MAX_ROWS}).`);
  const keys = Object.keys(rows[0]);
  const missing = [H.domain, H.standard, H.title].filter((h) => !keys.includes(h));
  if (missing.length) throw new Error(`أعمدة مطلوبة غير موجودة: ${missing.join("، ")}. حمّل القالب واستخدمه.`);

  const statusByLabel = new Map<string, IndicatorStatus>(
    (Object.keys(STATUS_LABELS) as IndicatorStatus[]).map((k) => [STATUS_LABELS[k], k]),
  );
  const domains = [...db.domains];
  const standards = [...db.standards];
  const indicators = [...db.indicators];
  const report: ImportReport = { added: 0, newDomains: 0, newStandards: 0, skipped: [], warnings: [] };

  rows.forEach((r, idx) => {
    const row = idx + 2;
    const domainTitle = s(r[H.domain]);
    const stdTitle = s(r[H.standard]);
    const title = s(r[H.title]);
    if (!domainTitle || !stdTitle || !title) return void report.skipped.push({ row, reason: "المجال والمعيار والمؤشر حقول مطلوبة" });

    const rawDue = r[H.due];
    let due = "";
    if (rawDue instanceof Date) due = toISO(rawDue);
    else if (s(rawDue)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(s(rawDue))) due = s(rawDue);
      else return void report.skipped.push({ row, reason: "تاريخ غير صالح (الصيغة المطلوبة YYYY-MM-DD)" });
    }

    let status: IndicatorStatus = "not_started";
    if (s(r[H.status])) {
      const st = statusByLabel.get(s(r[H.status]));
      if (!st) return void report.skipped.push({ row, reason: "حالة غير معروفة" });
      status = st;
    }

    let ownerId = "";
    if (s(r[H.owner])) {
      const u = db.users.find((x) => x.active && same(x.name, s(r[H.owner])));
      if (u) ownerId = u.id; else report.warnings.push(`الصف ${row}: المسؤولة "${s(r[H.owner])}" غير موجودة، تُرك المؤشر بلا مسؤولة`);
    }

    let domain = domains.find((d) => same(d.title, domainTitle));
    if (!domain) {
      domain = { id: uid(), code: String(domains.length + 1), title: domainTitle };
      domains.push(domain); report.newDomains++;
    }
    let std = standards.find((x) => x.domainId === domain!.id && same(x.title, stdTitle));
    if (!std) {
      const n = standards.filter((x) => x.domainId === domain!.id).length + 1;
      std = { id: uid(), domainId: domain.id, code: `${domain.code}-${n}`, title: stdTitle };
      standards.push(std); report.newStandards++;
    }
    if (indicators.some((i) => i.standardId === std!.id && same(i.title, title))) {
      return void report.skipped.push({ row, reason: "مؤشر مكرر في نفس المعيار" });
    }
    indicators.push({
      id: uid(), domainId: domain.id, standardId: std.id, code: s(r[H.code]), title,
      description: s(r[H.description]), status, ownerId, dueDate: due,
    });
    report.added++;
  });

  return { db: { ...db, domains, standards, indicators }, report };
}

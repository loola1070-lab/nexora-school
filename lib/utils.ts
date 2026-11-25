import type { IndicatorStatus, PlanStatus, Role } from "./types";

export type Tone = "slate" | "blue" | "green" | "amber" | "red";

export const cn = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");

export function uid(): string {
  // قاعدة البيانات تتطلب UUID صالحًا
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function toISO(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
export const todayISO = () => toISO(new Date());
export function addDays(n: number): string { const d = new Date(); d.setDate(d.getDate() + n); return toISO(d); }

export const STATUS_ORDER: IndicatorStatus[] = ["not_started", "in_progress", "completed", "needs_review"];
export const STATUS_LABELS: Record<IndicatorStatus, string> = {
  not_started: "لم يبدأ", in_progress: "قيد العمل", completed: "مكتمل", needs_review: "يحتاج إلى مراجعة",
};
export const STATUS_TONE: Record<IndicatorStatus, Tone> = {
  not_started: "slate", in_progress: "blue", completed: "green", needs_review: "amber",
};
export const STATUS_HEX: Record<IndicatorStatus, string> = {
  not_started: "#94a3b8", in_progress: "#4a72ad", completed: "#10b981", needs_review: "#f59e0b",
};
export const ROLE_LABELS: Record<Role, string> = {
  system_admin: "مدير النظام", school_admin: "مديرة المدرسة", supervisor: "مشرفة", member: "عضوة",
};
export const PLAN_LABELS: Record<PlanStatus, string> = { draft: "مسودة", active: "قيد التنفيذ", done: "منتهية" };
export const PLAN_TONE: Record<PlanStatus, Tone> = { draft: "slate", active: "blue", done: "green" };
export const EVIDENCE_CATEGORIES = ["محضر", "تقرير", "صور", "نموذج", "خطاب رسمي", "أخرى"];

export const percent = (part: number, total: number) => (total === 0 ? 0 : Math.round((part / total) * 100));
export const isOverdue = (due: string, done: boolean) => !done && !!due && due < todayISO();

export function formatBytes(n?: number): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

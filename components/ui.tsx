"use client";
import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Search, X } from "lucide-react";
import { cn, type Tone } from "@/lib/utils";

export const inputCls =
  "w-full rounded-xl border border-navy-200 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-navy-300 focus:border-navy-500 focus:ring-2 focus:ring-navy-200 disabled:bg-navy-50 disabled:text-navy-400";

export function Button({ variant = "primary", className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const v = {
    primary: "bg-navy-800 text-white hover:bg-navy-700 disabled:bg-navy-300",
    secondary: "border border-navy-200 bg-white text-navy-800 hover:bg-navy-50 disabled:text-navy-300",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ghost: "text-navy-700 hover:bg-navy-100",
  }[variant];
  return <button type="button" className={cn("inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed", v, className)} {...p} />;
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("print-card rounded-2xl border border-navy-100 bg-white shadow-card", className)}>{children}</div>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold text-navy-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-navy-500">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap gap-2 print:hidden">{actions}</div>
    </div>
  );
}

const TONES: Record<Tone, string> = {
  slate: "bg-slate-100 text-slate-700", blue: "bg-blue-50 text-blue-700", green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700", red: "bg-red-50 text-red-700",
};
export function Badge({ tone = "slate", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium", TONES[tone])}>{children}</span>;
}

export function StatCard({ label, value, icon: Icon, tone = "blue" }: { label: string; value: ReactNode; icon: React.ComponentType<{ className?: string }>; tone?: Tone }) {
  return (
    <Card className="flex items-center gap-4 p-4">
      <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", TONES[tone])}><Icon className="h-6 w-6" /></div>
      <div>
        <div className="text-2xl font-extrabold leading-none text-navy-900">{value}</div>
        <div className="mt-1.5 text-sm text-navy-500">{label}</div>
      </div>
    </Card>
  );
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-full min-w-[60px] overflow-hidden rounded-full bg-navy-100">
        <div className="h-full rounded-full bg-gradient-to-l from-navy-500 to-navy-800" style={{ width: `${value}%` }} />
      </div>
      <span className="w-10 text-xs font-medium text-navy-600">{value}%</span>
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return <div className="py-12 text-center text-sm text-navy-400">{text}</div>;
}

export function SearchInput({ value, onChange, placeholder = "بحث…" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative min-w-[200px] flex-1">
      <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
      <input className={cn(inputCls, "ps-9")} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </div>
  );
}

export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-navy-700">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/50 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className={cn("flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl", wide ? "max-w-4xl" : "max-w-xl")}>
        <div className="flex items-center justify-between border-b border-navy-100 px-5 py-4">
          <h2 className="text-lg font-bold text-navy-900">{title}</h2>
          <button onClick={onClose} aria-label="إغلاق" className="rounded-lg p-1 text-navy-400 hover:bg-navy-50"><X className="h-5 w-5" /></button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export function FormFooter({ onCancel, submitLabel = "حفظ" }: { onCancel: () => void; submitLabel?: string }) {
  return (
    <div className="mt-6 flex justify-end gap-2">
      <Button variant="secondary" onClick={onCancel}>إلغاء</Button>
      <button type="submit" className="inline-flex items-center justify-center rounded-xl bg-navy-800 px-4 py-2 text-sm font-medium text-white hover:bg-navy-700">{submitLabel}</button>
    </div>
  );
}

export function ConfirmModal({ open, title, message, onConfirm, onClose }: { open: boolean; title: string; message: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm leading-7 text-navy-700">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>إلغاء</Button>
        <Button variant="danger" onClick={() => { onConfirm(); onClose(); }}>تأكيد الحذف</Button>
      </div>
    </Modal>
  );
}

export const Th = ({ children }: { children?: ReactNode }) => <th className="whitespace-nowrap bg-navy-50 px-4 py-3 text-start text-xs font-semibold text-navy-600">{children}</th>;
export const Td = ({ children, className }: { children?: ReactNode; className?: string }) => <td className={cn("border-t border-navy-100 px-4 py-3 align-middle text-sm", className)}>{children}</td>;

"use client";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, School, Layers, ListChecks, Target, FolderOpen, TrendingUp, ClipboardList,
  BarChart3, Users, Menu, PanelRightClose, PanelRightOpen, LogOut, FlaskConical,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { canManageUsers } from "@/lib/permissions";
import { ROLE_LABELS, cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/school", label: "بيانات المدرسة", icon: School },
  { href: "/domains", label: "مجالات التقييم", icon: Layers },
  { href: "/standards", label: "المعايير", icon: ListChecks },
  { href: "/indicators", label: "المؤشرات", icon: Target },
  { href: "/evidence", label: "مكتبة الشواهد", icon: FolderOpen },
  { href: "/improvement", label: "خطط التحسين", icon: TrendingUp },
  { href: "/tasks", label: "المهام والمسؤوليات", icon: ClipboardList },
  { href: "/reports", label: "التقارير", icon: BarChart3 },
  { href: "/users", label: "المستخدمون والصلاحيات", icon: Users, admin: true },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const { ready, user, db, logout } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => { if (ready && !user) router.replace("/login"); }, [ready, user, router]);
  useEffect(() => setOpen(false), [pathname]);

  if (!ready || !user) {
    return <div className="flex min-h-screen items-center justify-center text-navy-500">جارٍ التحميل…</div>;
  }
  const items = NAV.filter((n) => !n.admin || canManageUsers(user.role));

  return (
    <div className="flex min-h-screen">
      {open && <div className="fixed inset-0 z-30 bg-navy-950/40 lg:hidden print:hidden" onClick={() => setOpen(false)} />}
      <aside className={cn(
        "fixed inset-y-0 start-0 z-40 flex w-64 flex-col bg-navy-900 text-navy-100 transition-transform duration-200 print:hidden",
        "lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:transition-[width]",
        open ? "translate-x-0" : "translate-x-full",
        collapsed ? "lg:w-[76px]" : "lg:w-64",
      )}>
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-lg font-extrabold text-white">N</div>
          <div className={cn("leading-tight", collapsed && "lg:hidden")}>
            <div className="text-base font-extrabold tracking-wide text-white">NEXORA</div>
            <div className="text-[11px] text-navy-300">School</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((n) => {
            const active = pathname === n.href;
            return (
              <Link key={n.href} href={n.href} title={n.label}
                className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                  active ? "bg-white text-navy-900 shadow" : "text-navy-200 hover:bg-white/10 hover:text-white")}>
                <n.icon className="h-5 w-5 shrink-0" />
                <span className={cn(collapsed && "lg:hidden")}>{n.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-3">
          <div className={cn("mb-2 px-2 text-xs", collapsed && "lg:hidden")}>
            <div className="truncate font-medium text-white">{user.name}</div>
            <div className="text-navy-300">{ROLE_LABELS[user.role]}</div>
          </div>
          <button onClick={() => { logout(); router.replace("/login"); }} title="تسجيل الخروج"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-navy-200 hover:bg-white/10">
            <LogOut className="h-5 w-5 shrink-0" /><span className={cn(collapsed && "lg:hidden")}>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-navy-100 bg-white/90 px-4 backdrop-blur print:hidden">
          <button className="rounded-lg p-2 text-navy-600 hover:bg-navy-50 lg:hidden" onClick={() => setOpen(true)} aria-label="فتح القائمة"><Menu className="h-5 w-5" /></button>
          <button className="hidden rounded-lg p-2 text-navy-600 hover:bg-navy-50 lg:block" onClick={() => setCollapsed((c) => !c)} aria-label="طي القائمة">
            {collapsed ? <PanelRightOpen className="h-5 w-5" /> : <PanelRightClose className="h-5 w-5" />}
          </button>
          <div className="min-w-0 flex-1 truncate font-bold text-navy-800">{db.school.name || "NEXORA School"}</div>
          <div className="hidden text-sm text-navy-500 sm:block">{db.school.year}</div>
        </header>
        <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 text-xs text-amber-800 print:hidden">
          <FlaskConical className="h-4 w-4 shrink-0" />
          <span>وضع تجريبي: البيانات محفوظة في هذا المتصفح فقط وليست في قاعدة بيانات، وقد تُفقد بمسح بيانات المتصفح. ربط Supabase في المرحلة التالية.</span>
        </div>
        <main className="flex-1 p-4 sm:p-6 print:p-0">{children}</main>
      </div>
    </div>
  );
}

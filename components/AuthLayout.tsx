import type { ReactNode } from "react";

export default function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-navy-950 via-navy-900 to-navy-700 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center text-white">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-2xl font-extrabold">N</div>
          <h1 className="text-3xl font-extrabold tracking-wide">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-navy-200">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

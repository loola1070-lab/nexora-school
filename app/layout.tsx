import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { StoreProvider } from "@/lib/store";
import "./globals.css";

export const metadata: Metadata = { title: "NEXORA School", description: "نظام إدارة التقييم والشواهد المدرسية" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#12233f" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet" />
      </head>
      <body><StoreProvider>{children}</StoreProvider></body>
    </html>
  );
}

import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource/vazirmatn/400.css";
import "@fontsource/vazirmatn/500.css";
import "@fontsource/vazirmatn/600.css";
import "@fontsource/vazirmatn/700.css";
import "./globals.css";
import AppProviders from "@/provider/app-providers";

export const metadata: Metadata = {
  title: { default: "سامانه ثبت عملکرد", template: "%s | سامانه ثبت عملکرد" },
  description: "سامانه ثبت عملکرد",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

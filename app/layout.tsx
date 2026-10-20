import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "PMD", description: "سامانه ثبت عملکرد" };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="fa" dir="rtl"><body>{children}</body></html>;
}

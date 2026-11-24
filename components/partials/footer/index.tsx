"use client";

import Link from "next/link";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card px-4 py-4 text-xs text-muted-foreground sm:px-6 lg:px-7 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>© {new Date().getFullYear()} سامانه ثبت عملکرد</span>
        <nav aria-label="پیوندهای فوتر" className="flex items-center gap-4">
          <Link href="/dashboard" className="hover:text-primary">داشبورد</Link>
          <Link href="/program-profiles" className="hover:text-primary">شناسنامه عملکرد</Link>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;

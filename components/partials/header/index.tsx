"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, Command, Menu, PanelRight, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import ThemeButton from "./theme-button";
import ProfileInfo from "./profile-info";
import { useSidebar } from "@/store";
import { Button } from "@/components/ui/button";
import { usePmdMenu } from "@/hooks/use-pmd-menu";

const Header = ({ handleOpenSearch: _handleOpenSearch }: { handleOpenSearch: () => void; trans?: any }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { collapsed, setCollapsed, setMobileMenu } = useSidebar();
  const menus = usePmdMenu();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  const pages = useMemo(() => menus.flatMap(group => group.child ?? []).filter(item => Boolean(item.href)), [menus]);
  const current = pages
    .filter(item => item.href && (pathname === item.href || pathname.startsWith(item.href + "/")))
    .sort((a, b) => (b.href?.length ?? 0) - (a.href?.length ?? 0))[0];

  const matches = pages.filter(item => item.title.includes(query.trim()) || item.href?.includes(query.trim())).slice(0, 30);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(open => !open);
      }
      if (event.key === "Escape") setSearchOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  useEffect(() => { setSearchOpen(false); setQuery(""); }, [pathname]);

  function openPage(href: string) {
    setSearchOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex min-h-[68px] items-center justify-between gap-2 border-b border-border bg-card/95 px-3 backdrop-blur sm:px-7 print:hidden">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <Button size="icon" variant="ghost" aria-label="باز کردن منوی اصلی" className="xl:hidden"
            onClick={() => setMobileMenu(true)}><Menu className="size-5"/></Button>
          <Button size="icon" variant="ghost" aria-label={collapsed ? "باز کردن نوار کناری" : "جمع کردن نوار کناری"}
            aria-expanded={!collapsed} className="hidden xl:inline-flex"
            onClick={() => setCollapsed(!collapsed)}><PanelRight className={cn("size-5", collapsed && "rotate-180")}/></Button>
          <nav aria-label="مسیر صفحه" className="flex min-w-0 items-center gap-2 text-xs sm:text-sm">
            <Link href="/dashboard" className="hidden shrink-0 text-muted-foreground hover:text-primary sm:inline">فضای کار</Link>
            <ChevronLeft className="hidden size-3.5 shrink-0 text-muted-foreground sm:block"/>
            <span aria-current="page" className="truncate font-bold text-foreground">{current?.title ?? "سامانه ثبت عملکرد"}</span>
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Button variant="outline" aria-label="جست‌وجو در صفحات" onClick={() => setSearchOpen(true)}
            className="h-10 gap-2 rounded-xl border-border bg-card px-2.5 text-muted-foreground sm:w-52 sm:justify-start">
            <Search className="size-4"/><span className="hidden whitespace-nowrap sm:inline">جست‌وجو در صفحات</span>
            <kbd dir="ltr" className="ms-auto hidden items-center gap-1 rounded border border-border px-1.5 text-[.62rem] lg:flex"><Command className="size-3"/> K</kbd>
          </Button>
          <ThemeButton/>
          <div className="border-r border-border pr-2"><ProfileInfo/></div>
        </div>
      </header>

      {searchOpen ? (
        <div className="fixed inset-0 z-[200] grid place-items-start justify-center overflow-y-auto bg-[#17182a]/55 px-3 pt-[12vh] print:hidden"
          onMouseDown={event => { if (event.target === event.currentTarget) setSearchOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-label="جست‌وجو در صفحات" className="w-[min(92vw,32rem)] rounded-2xl border border-border bg-card p-5 text-foreground shadow-2xl" dir="rtl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <strong className="text-base font-bold">جست‌وجو در صفحات</strong>
              <button type="button" aria-label="بستن جست‌وجو" onClick={() => setSearchOpen(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><X size={17}/></button>
            </div>
            <form onSubmit={event => { event.preventDefault(); if(matches[0]?.href) openPage(matches[0].href); }}>
              <input autoFocus className="field-input" aria-label="نام صفحه" placeholder="نام صفحه را وارد کنید" value={query} onChange={event => setQuery(event.target.value)}/>
            </form>
            <div className="mt-3 grid max-h-72 gap-1 overflow-y-auto">
              {matches.map(item => {
                const Icon=item.icon;
                return <button key={item.href} type="button" onClick={() => item.href && openPage(item.href)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-right text-sm hover:bg-muted focus-visible:bg-muted">
                  {Icon ? <Icon className="size-4 shrink-0 text-primary"/> : null}
                  <span className="flex-1">{item.title}</span><ChevronLeft className="size-4 text-muted-foreground"/>
                </button>;
              })}
              {!matches.length ? <p className="p-3 text-sm text-muted-foreground">صفحه‌ای پیدا نشد.</p> : null}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
};

export default Header;

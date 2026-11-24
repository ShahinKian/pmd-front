"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, PanelRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import ThemeButton from "./theme-button";
import ProfileInfo from "./profile-info";
import { useSidebar } from "@/store";
import { Button } from "@/components/ui/button";
import { usePmdMenu } from "@/hooks/use-pmd-menu";

const Header = ({ handleOpenSearch: _handleOpenSearch }: { handleOpenSearch: () => void; trans?: any }) => {
  const pathname = usePathname();
  const { collapsed, setCollapsed, setMobileMenu } = useSidebar();
  const menus = usePmdMenu();

  const current = menus
    .flatMap((group) => group.child ?? [])
    .filter((item) => item.href && (pathname === item.href || pathname.startsWith(item.href + "/")))
    .sort((a, b) => (b.href?.length ?? 0) - (a.href?.length ?? 0))[0];

  return (
    <header className="sticky top-0 z-30 flex min-h-[68px] items-center justify-between gap-3 border-b border-border bg-card/95 px-3 backdrop-blur sm:px-6 lg:px-7 print:hidden">
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        <Button
          size="icon"
          variant="ghost"
          aria-label="باز کردن منوی اصلی"
          className="xl:hidden"
          onClick={() => setMobileMenu(true)}
        >
          <Menu className="size-5" />
        </Button>

        <Button
          size="icon"
          variant="ghost"
          aria-label={collapsed ? "باز کردن نوار کناری" : "جمع کردن نوار کناری"}
          className="hidden xl:inline-flex"
          onClick={() => setCollapsed(!collapsed)}
        >
          <PanelRight className={cn("size-5 transition-transform", collapsed && "rotate-180")} />
        </Button>

        <nav aria-label="مسیر صفحه" className="flex min-w-0 items-center gap-2 text-xs sm:text-sm">
          <Link href="/dashboard" className="hidden shrink-0 text-muted-foreground hover:text-primary sm:inline">
            سامانه ثبت عملکرد
          </Link>
          <ChevronLeft className="hidden size-3.5 shrink-0 text-muted-foreground sm:block" />
          <span aria-current="page" className="truncate font-bold text-foreground">
            {current?.title ?? "داشبورد"}
          </span>
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <ThemeButton />
        <div className="border-r border-border pr-2">
          <ProfileInfo />
        </div>
      </div>
    </header>
  );
};

export default Header;

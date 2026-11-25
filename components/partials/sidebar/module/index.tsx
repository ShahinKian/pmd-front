"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronLeft, LogOut, Orbit, X } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/store";
import { usePmdMenu } from "@/hooks/use-pmd-menu";
import { apiClient } from "@/lib/http/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PmdMenuItem } from "@/config/menus";

function CompactSidebarMenu({ group, selectedHref, open, onOpenChange }: {
  group: PmdMenuItem;
  selectedHref?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openedByHover = useRef(false);

  function cancelClose() {
    if (closeTimer.current !== null) clearTimeout(closeTimer.current);
  }

  useEffect(() => cancelClose, []);

  function changeOpen(nextOpen: boolean) {
    cancelClose();
    openedByHover.current = false;
    onOpenChange(nextOpen);
  }

  function handlePointerEnter(event: PointerEvent) {
    if (event.pointerType !== "mouse") return;
    cancelClose();
    if (!open) {
      openedByHover.current = true;
      onOpenChange(true);
    }
  }

  function handlePointerLeave(event: PointerEvent) {
    if (event.pointerType !== "mouse" || !openedByHover.current) return;
    cancelClose();
    closeTimer.current = setTimeout(() => onOpenChange(false), 180);
  }

  const active = group.child?.some(item => item.href && item.href === selectedHref);
  return (
    <DropdownMenu open={open} onOpenChange={changeOpen} modal={false} dir="rtl">
      <DropdownMenuTrigger
        aria-label={group.title}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerDown={(event) => {
          if (open && openedByHover.current && event.pointerType === "mouse" && event.button === 0)
            event.preventDefault();
        }}
        className={cn(
          "mx-auto hidden size-11 place-items-center rounded-xl text-[#d3d1ea] hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#b8a6ff] lg:grid",
          (active || open) && "bg-[#493b7e] text-white",
        )}
      >
        <group.icon className="size-5" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="left"
        align="start"
        sideOffset={8}
        collisionPadding={8}
        onPointerEnter={(event) => { if (event.pointerType === "mouse") cancelClose(); }}
        onPointerLeave={handlePointerLeave}
        onCloseAutoFocus={(event) => { if (openedByHover.current) event.preventDefault(); }}
        className="hidden max-h-[var(--radix-dropdown-menu-content-available-height)] w-56 overflow-y-auto rounded-xl border-[#4a416c] bg-[#2b254a] p-2 text-[#d3d1ea] lg:block"
      >
        <DropdownMenuLabel className="mb-1 border-b border-white/10 text-[#d8caff]">{group.title}</DropdownMenuLabel>
        {(group.child ?? []).map(item => {
          if (!item.href) return null;
          const Icon = item.icon;
          const isCurrent = item.href === selectedHref;
          return (
            <DropdownMenuItem asChild key={item.href} className={cn(
              "min-h-10 cursor-pointer gap-2 rounded-lg px-2 text-white hover:bg-white/10 focus:bg-[#493b7e] focus:text-white",
              isCurrent && "bg-[#493b7e]",
            )}>
              <Link href={item.href} aria-current={isCurrent ? "page" : undefined}>
                {Icon ? <Icon className="size-4 shrink-0" aria-hidden="true" /> : null}
                <span className="flex-1">{item.title}</span>
                {item.badge ? <span className="rounded-full bg-[#6956ac] px-2 py-0.5 text-[10px]">{item.badge}</span> : null}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const ModuleSidebar = ({ trans: _trans }: { trans: any }) => {
  const menus = usePmdMenu();
  const pathname = usePathname();
  const router = useRouter();
  const selectedHref = menus.flatMap((group) => group.child ?? [])
    .filter((item) => item.href && (pathname === item.href || pathname.startsWith(item.href + "/")))
    .sort((a, b) => (b.href?.length ?? 0) - (a.href?.length ?? 0))[0]?.href;
  const { collapsed, setCollapsed, mobileMenu, setMobileMenu } = useSidebar();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [compactGroup, setCompactGroup] = useState<string | null>(null);

  useEffect(() => {
    if (!collapsed) setCompactGroup(null);
  }, [collapsed]);

  async function logout() {
    await apiClient.post("/auth/logout");
    router.replace("/login");
  }

  return (
    <>
      {mobileMenu ? (
        <button
          type="button"
          aria-label="بستن منو"
          className="fixed inset-0 z-40 bg-black/45 lg:hidden"
          onClick={() => setMobileMenu(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed right-0 top-0 z-50 flex h-dvh flex-col overflow-hidden border-l border-[#302956] bg-[#211d3c] text-white transition-all duration-300 print:hidden",
          collapsed ? "lg:w-[76px]" : "lg:w-[236px]",
          mobileMenu ? "w-[236px] translate-x-0" : "w-[240px] translate-x-full lg:translate-x-0",
        )}
      >
        <div className={cn("flex min-h-[76px] shrink-0 items-center px-2 pt-3", collapsed ? "lg:justify-center" : "justify-between")}>
          <Link
            href="/dashboard"
            onClick={() => setMobileMenu(false)}
            className={cn("flex min-w-0 items-center gap-3 rounded-xl px-1", collapsed && "lg:justify-center")}
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#b8a6ff] text-[#242044]">
              <Orbit className="size-6" />
            </span>
            <span className={cn("min-w-0", collapsed && "lg:hidden")}>
              <strong className="block truncate text-base font-black">سامانه ثبت عملکرد</strong>
              <span className="block truncate text-[11px] text-[#aaa7ca]">پنل مدیریت فارسی</span>
            </span>
          </Link>

          <Button
            size="icon"
            variant="ghost"
            aria-label="بستن منو"
            className="text-white hover:bg-white/10 hover:text-white lg:hidden"
            onClick={() => setMobileMenu(false)}
          >
            <X className="size-5" />
          </Button>
        </div>

        <nav className={cn(
          "flex-1 overflow-y-auto px-3 py-6 [scrollbar-width:thin] [scrollbar-color:#514775_transparent]",
          collapsed && "lg:pt-9",
        )} aria-label="منوی اصلی">
          <div className={cn("grid gap-5", collapsed && "lg:gap-2")}>
            {menus.map((group) => (
              <div key={group.title}>
                {collapsed ? <CompactSidebarMenu
                  group={group}
                  selectedHref={selectedHref}
                  open={compactGroup === group.title}
                  onOpenChange={(open) => setCompactGroup(current =>
                    open ? group.title : current === group.title ? null : current)}
                /> : null}
                <button
                  type="button"
                  aria-expanded={Boolean(openGroups[group.title])}
                  onClick={() => setOpenGroups(current => ({ ...current, [group.title]: !current[group.title] }))}
                  className={cn("mb-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-right text-[13px] font-bold text-[#aaa7ca] transition-colors hover:bg-white/5 hover:text-white", collapsed && "lg:hidden")}
                >
                  <group.icon className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{group.title}</span>
                  <ChevronDown className={cn("size-3.5 shrink-0 transition-transform", !openGroups[group.title] && "-rotate-90")} />
                </button>
                <div className={cn(
                  "gap-1 overflow-hidden",
                  openGroups[group.title] ? "grid" : "hidden",
                  collapsed && "lg:hidden",
                )}>
                  {(group.child ?? []).map((item) => {
                    const active = Boolean(item.href && item.href === selectedHref);
                    const Icon = item.icon;
                    return item.href ? (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={collapsed ? item.title : undefined}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setMobileMenu(false)}
                        className={cn(
                          "flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-[#d3d1ea] transition-colors hover:bg-white/8 hover:text-white focus-visible:outline-2 focus-visible:outline-[#b8a6ff]",
                          collapsed && "lg:justify-center lg:px-0",
                          active && "bg-[#493b7e] text-white ring-1 ring-[#6956ac]",
                        )}
                      >
                        {Icon ? <Icon className={cn("size-[18px] shrink-0", active && "text-[#d8caff]")} /> : null}
                        <span className={cn("min-w-0 flex-1 truncate", collapsed && "lg:sr-only")}>{item.title}</span>
                        {item.badge ? <span className={cn("rounded-full bg-[#6956ac] px-2 py-0.5 text-[10px] text-white", collapsed && "lg:hidden")}>{item.badge}</span> : null}
                      </Link>
                    ) : null;
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={logout}
            title={collapsed ? "خروج" : undefined}
            className={cn(
              "flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-[#d3d1ea] transition-colors hover:bg-white/8 hover:text-white",
              collapsed && "lg:justify-center lg:px-0",
            )}
          >
            <LogOut className="size-[18px] shrink-0" />
            <span className={cn(collapsed && "lg:sr-only")}>خروج</span>
          </button>
        </div>

        <button
          type="button"
          aria-label={collapsed ? "باز کردن نوار کناری" : "جمع کردن نوار کناری"}
          onClick={() => setCollapsed(!collapsed)}
          className="absolute left-2 top-[76px] hidden size-7 place-items-center rounded-full border border-[#4a416c] bg-[#2b254a] text-[#d9d3f5] shadow-md hover:bg-[#3a3262] lg:grid"
        >
          <ChevronLeft className={cn("size-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </aside>
    </>
  );
};

export default ModuleSidebar;

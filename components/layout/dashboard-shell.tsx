"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  FolderKanban,
  Link2,
  LogOut,
  Menu,
  RadioTower,
  ShieldCheck,
  UserCog,
  UserPlus,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/http/client";
import { useSession } from "@/hooks/use-session";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface MenuItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
}

interface MenuGroup {
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  items: MenuItem[];
}

function initials(value?: string | null) {
  const words = (value ?? "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "ک";
  return words.slice(0, 2).map((word) => word[0]).join("");
}

function isLocationMatch(href: string, pathname: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
}

export default function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [activeGroup, setActiveGroup] = useState(0);

  const canManagePlanProviders = Boolean(
    session?.isSystemAdmin || session?.user.roles.includes("PlanManager"),
  );

  const groups = useMemo<MenuGroup[]>(
    () =>
      [
        {
          label: "اصلی",
          icon: BarChart3,
          items: [{ href: "/dashboard", label: "داشبورد", icon: BarChart3 }],
        },
        {
          label: "ثبت عملکرد",
          icon: ClipboardList,
          items: [
            { href: "/forecasts", label: "پیش‌بینی برنامه", icon: ClipboardList },
            { href: "/program-profiles", label: "شناسنامه عملکرد", icon: FileText },
          ],
        },
        {
          label: "طرح و تهیه‌کننده",
          icon: Link2,
          items: [
            ...(session?.user.roles.includes("Providers")
              ? [{ href: "/my-plans", label: "طرح‌های من", icon: FolderKanban }]
              : []),
            ...(canManagePlanProviders
              ? [
                  {
                    href: "/plan-providers",
                    label: "تخصیص طرح به تهیه‌کننده",
                    icon: Link2,
                  },
                ]
              : []),
          ],
        },
        {
          label: "مدیریت کاربران",
          icon: Users,
          items: session?.isSystemAdmin
            ? [
                { href: "/users", label: "کاربران", icon: Users },
                { href: "/users/new", label: "تعریف کاربر", icon: UserPlus },
                { href: "/users/manage", label: "ویرایش دسترسی", icon: UserCog },
              ]
            : [],
        },
      ].filter((group) => group.items.length > 0),
    [session, canManagePlanProviders],
  );

  useEffect(() => {
    const index = groups.findIndex((group) =>
      group.items.some((item) => isLocationMatch(item.href, pathname)),
    );
    if (index >= 0) setActiveGroup(index);
  }, [groups, pathname]);

  async function logout() {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  const currentGroup = groups[activeGroup] ?? groups[0];

  return (
    <div className="dash-tail-app theme-violet min-h-screen">
      <div className="main-sidebar pointer-events-none fixed start-0 top-0 z-[60] flex h-full xl:z-10 print:hidden">
        <div
          className={cn(
            "border-default-200 dark:border-default-300 pointer-events-auto relative z-20 flex h-full w-[72px] flex-col border-r border-dashed bg-card transition-all duration-300",
          )}
        >
          <div className="pt-4">
            <Link
              href="/dashboard"
              className="mx-auto flex h-8 w-8 items-center justify-center text-primary"
              aria-label="سامانه ثبت عملکرد"
            >
              <RadioTower className="h-8 w-8" />
            </Link>
          </div>

          <ScrollArea className="pt-6 grow">
            {groups.map((group, index) => {
              const Icon = group.icon;
              const active = index === activeGroup;

              return (
                <div key={group.label} className="mb-3 last:mb-0">
                  <button
                    type="button"
                    title={group.label}
                    onClick={() => {
                      setActiveGroup(index);
                      setCollapsed(false);
                    }}
                    className={cn(
                      "h-12 w-12 mx-auto rounded-md transition-all duration-300 flex flex-col items-center justify-center cursor-pointer relative",
                      active
                        ? "bg-primary/10 dark:bg-primary dark:text-primary-foreground text-primary"
                        : "text-default-500 dark:text-default-400 hover:bg-primary/10 hover:text-primary",
                    )}
                  >
                    <Icon className="w-6 h-6" />
                  </button>
                </div>
              );
            })}
          </ScrollArea>

          <div className="space-y-5 flex flex-col items-center justify-center pb-6">
            <Avatar className="h-9 w-9">
              {session?.user.profilePictureUrl ? (
                <AvatarImage
                  src="/api/auth/profile/picture/view"
                  alt={session.user.fullName || session.user.userName}
                />
              ) : null}
              <AvatarFallback>
                {initials(session?.user.fullName || session?.user.userName)}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        <div
          className={cn(
            "border-default-200 pointer-events-auto relative z-10 flex flex-col h-full w-[228px] border-r bg-card transition-all duration-300",
            collapsed && "rtl:translate-x-[calc(100%_+_72px)] translate-x-[calc(-100%_-_72px)]",
          )}
        >
          <h2 className="text-lg bg-transparent z-50 font-semibold flex gap-4 items-center text-default-700 sticky top-0 py-4 px-4 capitalize">
            <span className="block flex-1">{currentGroup?.label ?? ""}</span>
            <Button
              size="icon"
              variant="ghost"
              type="button"
              onClick={() => setCollapsed(true)}
              className="rounded-full h-8 w-8"
              aria-label="بستن منو"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </h2>

          <ScrollArea className="h-[calc(100%-96px)] grow">
            <div className="px-4" dir="rtl">
              <ul>
                {(currentGroup?.items ?? []).map((item) => {
                  const Icon = item.icon;
                  const active = isLocationMatch(item.href, pathname);

                  return (
                    <li key={item.href} className="mb-1.5 last:mb-0">
                      <Link
                        href={item.href}
                        className={cn(
                          "flex font-medium text-sm capitalize px-[10px] py-3 gap-3 rounded-md cursor-pointer",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "text-default-600 hover:bg-default-100",
                        )}
                      >
                        <span className="inline-flex items-center flex-grow-0">
                          <Icon className="h-5 w-5" />
                        </span>
                        <div className="flex-grow truncate">{item.label}</div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </ScrollArea>

          <div className="bg-default-50 dark:bg-default-200 items-center flex gap-3 px-4 py-2 mt-5">
            <Avatar className="h-9 w-9">
              {session?.user.profilePictureUrl ? (
                <AvatarImage
                  src="/api/auth/profile/picture/view"
                  alt={session.user.fullName || session.user.userName}
                />
              ) : null}
              <AvatarFallback>
                {initials(session?.user.fullName || session?.user.userName)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="text-default-700 font-semibold text-sm capitalize mb-0.5 truncate">
                {session?.user.fullName || session?.user.userName || "کاربر سامانه"}
              </div>
              <div className="text-xs text-default-600 truncate">
                {session?.roleLabels?.join("، ") ?? ""}
              </div>
            </div>

            <div className="flex-none">
              <button
                type="button"
                onClick={logout}
                className="text-default-500 inline-flex h-9 w-9 rounded items-center dark:bg-default-300 justify-center dark:text-default-900 hover:text-primary"
                title="خروج"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <header
        className={cn(
          "z-50 sticky top-0 transition-all duration-150",
          collapsed
            ? "ltr:xl:ml-[72px] rtl:xl:mr-[72px]"
            : "ltr:xl:ml-[300px] rtl:xl:mr-[300px]",
        )}
      >
        <div className="w-full bg-card/90 backdrop-blur-lg md:px-6 px-[15px] py-3 border-b">
          <div className="flex justify-between items-center h-full">
            <div className="flex items-center md:gap-6 gap-3">
              <button
                type="button"
                className="relative group text-default-600"
                onClick={() => setCollapsed((value) => !value)}
                aria-label="باز و بسته کردن منو"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <div className="text-sm font-semibold text-default-800">
                  سامانه ثبت عملکرد
                </div>
                <div className="text-xs text-default-500 mt-0.5">
                  مدیریت یکپارچه فرآیند ثبت و بررسی عملکرد
                </div>
              </div>
            </div>

            <div className="nav-tools flex items-center gap-2">
              {session?.isSystemAdmin ? (
                <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  <ShieldCheck className="h-4 w-4" />
                  مدیر سیستم
                </span>
              ) : null}

              <div className="flex items-center gap-2 ltr:pl-2 rtl:pr-2">
                <Avatar className="h-9 w-9">
                  {session?.user.profilePictureUrl ? (
                    <AvatarImage
                      src="/api/auth/profile/picture/view"
                      alt={session.user.fullName || session.user.userName}
                    />
                  ) : null}
                  <AvatarFallback>
                    {initials(session?.user.fullName || session?.user.userName)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block">
                  <div className="text-sm font-medium text-default-800">
                    {session?.user.fullName || session?.user.userName || "کاربر سامانه"}
                  </div>
                  <div className="text-xs text-default-600">
                    {session?.roleLabels?.[0] ?? ""}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div
        className={cn(
          "content-wrapper transition-all duration-150",
          collapsed
            ? "ltr:xl:ml-[72px] rtl:xl:mr-[72px]"
            : "ltr:xl:ml-[300px] rtl:xl:mr-[300px]",
        )}
      >
        <div className="layout-padding px-6 pt-6 page-min-height">
          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}

export function Breadcrumb({
  items,
}: {
  items: Array<{ label: string; href?: string }>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-sm text-default-500 mb-4">
      {items.map((item, index) => (
        <span key={item.label} className="flex items-center gap-1.5">
          {index > 0 ? <ChevronLeft className="h-3.5 w-3.5" /> : null}
          {item.href ? (
            <Link href={item.href} className="hover:text-primary">
              {item.label}
            </Link>
          ) : (
            <span className="text-default-700">{item.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}

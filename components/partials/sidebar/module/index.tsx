"use client";
import React, { useEffect, useState } from "react";
import { ChevronLeft, RadioTower } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, getDynamicPath, isLocationMatch } from "@/lib/utils";
import { useSidebar, useThemeStore } from "@/store";
import { useSession } from "@/hooks/use-session";
import { getPmdMenus } from "@/config/menus";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMediaQuery } from "@/hooks/use-media-query";
import SingleIconMenu from "./single-icon-menu";
import MenuItem from "./menu-item";
import MenuOverlayPortal from "./MenuOverlayPortal";
import { apiClient } from "@/lib/http/client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

function initials(value?: string | null) {
  const words = (value ?? "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "ک";
  return words.slice(0, 2).map((word) => word[0]).join("");
}

const ModuleSidebar = ({ trans }: { trans: any }) => {
  const { data: session } = useSession();
  const menus = getPmdMenus(session);
  const { subMenu, setSubmenu, collapsed, setCollapsed } = useSidebar();
  const { isRtl } = useThemeStore();
  const [activeIndex, setActiveIndex] = useState<number | null>(0);
  const [currentSubMenu, setCurrentSubMenu] = useState<any[]>(menus[0]?.child ?? []);
  const [menuOverlay, setMenuOverlay] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 1280px)");
  const pathname = usePathname();
  const locationName = getDynamicPath(pathname);
  const router = useRouter();

  useEffect(() => {
    let matched = false;
    menus.forEach((item, i) => {
      item.child?.forEach((child) => {
        if (child.href && isLocationMatch(child.href, locationName)) {
          setActiveIndex(i);
          setCurrentSubMenu(item.child ?? []);
          setSubmenu(false);
          setCollapsed(false);
          matched = true;
        }
      });
    });
    if (!matched && menus[0]) {
      setActiveIndex(0);
      setCurrentSubMenu(menus[0].child ?? []);
    }
  }, [locationName, menus.length, setCollapsed, setSubmenu]);

  const toggleSubMenu = (index: number) => {
    setActiveIndex(index);
    setCurrentSubMenu(menus[index]?.child ?? []);
    setSubmenu(false);
    setCollapsed(false);
    if (!isDesktop) setMenuOverlay(true);
  };

  async function logout() {
    await apiClient.post("/auth/logout");
    router.replace("/login");
  }

  return (
    <>
      <div className="main-sidebar pointer-events-none fixed start-0 top-0 z-[60] flex h-full xl:z-10 print:hidden">
        <div
          className={cn(
            "border-default-200 dark:border-default-300 pointer-events-auto relative z-20 flex h-full w-[72px] flex-col border-r border-dashed bg-card transition-all duration-300",
            {
              "ltr:-translate-x-full rtl:translate-x-full ltr:xl:translate-x-0 rtl:xl:translate-x-0":
                !collapsed && subMenu,
              "translate-x-0": collapsed,
            },
          )}
        >
          <div className="pt-4">
            <Link href="/dashboard" prefetch className="mx-auto flex h-8 w-8 items-center justify-center text-primary">
              <RadioTower className="h-8 w-8" />
            </Link>
          </div>

          <ScrollArea className="pt-6 grow">
            {menus.map((item, i) => (
              <div key={item.title} onClick={() => toggleSubMenu(i)} className="mb-3 last:mb-0">
                <SingleIconMenu
                  index={i}
                  activeIndex={activeIndex}
                  item={item}
                  locationName={locationName}
                  trans={trans}
                />
              </div>
            ))}
          </ScrollArea>

          <div className="space-y-5 flex flex-col items-center justify-center pb-6">
            <Avatar className="h-9 w-9">
              {session?.user.profilePictureUrl ? (
                <AvatarImage src="/api/auth/profile/picture/view" alt={session.user.fullName || session.user.userName} />
              ) : null}
              <AvatarFallback>{initials(session?.user.fullName || session?.user.userName)}</AvatarFallback>
            </Avatar>
          </div>
        </div>

        <div
          className={cn(
            "border-default-200 pointer-events-auto relative z-10 flex flex-col h-full w-[228px] border-r bg-card transition-all duration-300",
            {
              "rtl:translate-x-[calc(100%_+_72px)] translate-x-[calc(-100%_-_72px)]": collapsed || subMenu,
            },
          )}
        >
          <h2 className="text-lg bg-transparent z-50 font-semibold flex gap-4 items-center text-default-700 sticky top-0 py-4 px-4 capitalize">
            <span className="block flex-1">{menus[activeIndex ?? 0]?.title ?? ""}</span>
            {!isDesktop ? (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  setCollapsed(true);
                  setSubmenu(true);
                  setMenuOverlay(false);
                }}
                className="rounded-full h-8 w-8"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
            ) : null}
          </h2>

          <ScrollArea className="h-[calc(100%-40px)] grow">
            <div className="px-4" dir={isRtl ? "rtl" : "ltr"}>
              <ul>
                {currentSubMenu.map((childItem, j) => (
                  <li key={childItem.href ?? j} className="mb-1.5 last:mb-0">
                    <MenuItem childItem={childItem} locationName={locationName} trans={trans} />
                  </li>
                ))}
              </ul>
            </div>
          </ScrollArea>

          <div className="bg-default-50 dark:bg-default-200 items-center flex gap-3 px-4 py-2 mt-5">
            <div className="flex-1 min-w-0">
              <div className="text-default-700 font-semibold text-sm capitalize mb-0.5 truncate">
                {session?.user.fullName || session?.user.userName || "کاربر سامانه"}
              </div>
              <div className="text-xs text-default-600 truncate">{session?.roleLabels?.join("، ") ?? ""}</div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="text-default-500 inline-flex h-9 w-9 rounded items-center dark:bg-default-300 justify-center dark:text-default-900"
              title="خروج"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {!isDesktop ? (
        <MenuOverlayPortal
          isOpen={menuOverlay || collapsed}
          onClose={() => {
            setMenuOverlay(false);
            setSubmenu(true);
            setCollapsed(false);
          }}
        />
      ) : null}
    </>
  );
};

export default ModuleSidebar;

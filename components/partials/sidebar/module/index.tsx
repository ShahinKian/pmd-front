"use client";
import React, { useEffect, useState } from "react";
import { cn, isLocationMatch, getDynamicPath, translate } from "@/lib/utils";
import SingleIconMenu from "./single-icon-menu";
import { usePathname } from "next/navigation";
import { useSidebar, useThemeStore } from "@/store";
import MenuItem from "./menu-item";
import { SiteLogo } from "@/components/svg";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";
import LogoutFooter from "./logout-footer";
import { useMediaQuery } from "@/hooks/use-media-query";
import MenuOverlayPortal from "./MenuOverlayPortal";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePmdMenu } from "@/hooks/use-pmd-menu";

const ModuleSidebar = ({ trans }: { trans: any }) => {
  const menus = usePmdMenu();
  const { subMenu, setSubmenu, collapsed, setCollapsed, sidebarBg } = useSidebar();
  const { isRtl } = useThemeStore();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [currentSubMenu, setCurrentSubMenu] = useState<any[]>([]);
  const [menuOverlay, setMenuOverlay] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 1280px)");
  const pathname = usePathname();
  const locationName = getDynamicPath(pathname);

  const toggleSubMenu = (index: number) => {
    setActiveIndex(index);
    setCurrentSubMenu(menus[index]?.child ?? []);
    setSubmenu(false);
    setCollapsed(false);
    if (!isDesktop) setMenuOverlay(true);
  };

  useEffect(() => {
    let matched = false;
    menus.forEach((item: any, i: number) => {
      item?.child?.forEach((childItem: any) => {
        if (childItem.href && isLocationMatch(childItem.href, locationName)) {
          setActiveIndex(i);
          setCurrentSubMenu(item.child ?? []);
          setSubmenu(false);
          setCollapsed(false);
          setMenuOverlay(false);
          matched = true;
        }
      });
    });
    if (!matched && menus.length) {
      setActiveIndex(0);
      setCurrentSubMenu(menus[0].child ?? []);
    }
    if (!isDesktop) setSubmenu(true);
  }, [locationName, isDesktop, menus.length, setCollapsed, setSubmenu]);

  const getMenuTitle = () => activeIndex !== null ? menus[activeIndex]?.title ?? "" : "";

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
            <Link href="/dashboard" prefetch>
              <SiteLogo className="mx-auto text-primary h-8 w-8" />
            </Link>
          </div>

          <ScrollArea className="pt-6 grow">
            {menus.map((item, i) => (
              <div key={i} onClick={() => toggleSubMenu(i)} className="mb-3 last:mb-0">
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
          <LogoutFooter />
        </div>

        <div
          className={cn(
            "border-default-200 pointer-events-auto relative z-10 flex flex-col h-full w-[228px] border-r bg-card transition-all duration-300",
            {
              "rtl:translate-x-[calc(100%_+_72px)] translate-x-[calc(-100%_-_72px)]":
                collapsed || subMenu,
            },
          )}
        >
          {sidebarBg !== "none" && (
            <div
              className="absolute left-0 top-0 z-[-1] w-full h-full bg-cover bg-center opacity-[0.07]"
              style={{ backgroundImage: `url(${sidebarBg})` }}
            />
          )}

          <h2 className="text-lg bg-transparent z-50 font-semibold flex gap-4 items-center text-default-700 sticky top-0 py-4 px-4 capitalize">
            <span className="block">{translate(getMenuTitle(), trans)}</span>
            {!isDesktop && (
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
            )}
          </h2>

          <ScrollArea className="h-[calc(100%-40px)] grow">
            <div className="px-4" dir={isRtl ? "rtl" : "ltr"}>
              <ul>
                {currentSubMenu?.map((childItem, j) => (
                  <li key={j} className="mb-1.5 last:mb-0">
                    <MenuItem
                      trans={trans}
                      childItem={childItem}
                      toggleNested={() => {}}
                      index={j}
                      nestedIndex={null}
                      locationName={locationName}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </ScrollArea>

          <LogoutFooter />
        </div>
      </div>

      {!isDesktop && (
        <MenuOverlayPortal
          isOpen={menuOverlay || collapsed}
          onClose={() => {
            setMenuOverlay(false);
            setSubmenu(true);
            setCollapsed(false);
          }}
        />
      )}
    </>
  );
};

export default ModuleSidebar;

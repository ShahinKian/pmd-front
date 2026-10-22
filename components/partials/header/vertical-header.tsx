"use client";
import React from "react";
import { useSidebar, useThemeStore } from "@/store";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { SiteLogo } from "@/components/svg";
import Link from "next/link";
import { useMediaQuery } from "@/hooks/use-media-query";

const MenuBar = ({ collapsed, setCollapsed }: { collapsed: boolean; setCollapsed: (value: boolean) => void }) => (
  <button className="relative group" onClick={() => setCollapsed(!collapsed)} type="button">
    <div
      className={cn(
        "flex flex-col justify-between w-[20px] h-[16px] transform transition-all duration-300 origin-center overflow-hidden",
        { "-translate-x-1.5 rotate-180": collapsed },
      )}
    >
      <div className={cn("bg-card-foreground h-[2px] transform transition-all duration-300 origin-left delay-150", {
        "rotate-[42deg] w-[11px]": collapsed,
        "w-7": !collapsed,
      })} />
      <div className={cn("bg-card-foreground h-[2px] w-7 rounded transform transition-all duration-300", {
        "translate-x-10": collapsed,
      })} />
      <div className={cn("bg-card-foreground h-[2px] transform transition-all duration-300 origin-left delay-150", {
        "-rotate-[43deg] w-[11px]": collapsed,
        "w-7": !collapsed,
      })} />
    </div>
  </button>
);

const VerticalHeader = ({ handleOpenSearch }: { handleOpenSearch: () => void }) => {
  const { collapsed, setCollapsed, subMenu, sidebarType } = useSidebar();
  const { layout } = useThemeStore();
  const isDesktop = useMediaQuery("(min-width: 1280px)");
  const isMobile = useMediaQuery("(min-width: 768px)");

  let logoContent: React.ReactNode = null;
  let menuBarContent: React.ReactNode = null;
  let searchButtonContent: React.ReactNode = null;

  const mainLogo = (
    <Link href="/dashboard" prefetch className="text-primary">
      <SiteLogo className="h-7 w-7" />
    </Link>
  );

  const searchButton = (
    <button
      type="button"
      className="inline-flex gap-2 items-center text-default-600 text-sm"
      onClick={handleOpenSearch}
    >
      <Search className="h-4 w-4" />
      <span className="md:block hidden">جستجو...</span>
    </button>
  );

  if (layout === "vertical" && !isDesktop && isMobile && sidebarType === "module") logoContent = mainLogo;
  if (sidebarType === "module") menuBarContent = <MenuBar collapsed={collapsed} setCollapsed={setCollapsed} />;
  if (subMenu && isDesktop) menuBarContent = null;
  if (sidebarType === "module" && isMobile) searchButtonContent = searchButton;

  return (
    <div className="flex items-center md:gap-6 gap-3">
      {logoContent}
      {menuBarContent}
      {searchButtonContent}
    </div>
  );
};

export default VerticalHeader;

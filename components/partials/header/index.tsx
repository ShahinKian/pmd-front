"use client";
import React from "react";
import { cn } from "@/lib/utils";
import ThemeButton from "./theme-button";
import { useSidebar, useThemeStore } from "@/store";
import ProfileInfo from "./profile-info";
import VerticalHeader from "./vertical-header";
import { useMediaQuery } from "@/hooks/use-media-query";
import ClassicHeader from "./layout/classic-header";

const NavTools = () => {
  return (
    <div className="nav-tools flex items-center gap-2">
      <ThemeButton />
      <div className="ltr:pl-2 rtl:pr-2">
        <ProfileInfo />
      </div>
    </div>
  );
};

const Header = ({ handleOpenSearch }: { handleOpenSearch: () => void; trans?: any }) => {
  const { collapsed, sidebarType } = useSidebar();
  const { navbarType } = useThemeStore();
  useMediaQuery("(min-width: 1280px)");

  if (navbarType === "hidden") return null;

  return (
    <ClassicHeader
      className={cn("", {
        "ltr:xl:ml-[300px] rtl:xl:mr-[300px]": !collapsed && sidebarType === "module",
        "ltr:xl:ml-[72px] rtl:xl:mr-[72px]": collapsed,
        "sticky top-0": navbarType === "sticky",
      })}
    >
      <div className="w-full bg-card/90 backdrop-blur-lg md:px-6 px-[15px] py-3 border-b">
        <div className="flex justify-between items-center h-full">
          <VerticalHeader handleOpenSearch={handleOpenSearch} />
          <NavTools />
        </div>
      </div>
    </ClassicHeader>
  );
};

export default Header;

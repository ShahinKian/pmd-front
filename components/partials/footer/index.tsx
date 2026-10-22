"use client";
import React from "react";
import { useSidebar, useThemeStore } from "@/store";
import { cn } from "@/lib/utils";
import FooterLayout from "./footer-layout";

const Footer = () => {
  const { collapsed } = useSidebar();
  const { footerType } = useThemeStore();

  if (footerType === "hidden") return null;

  return (
    <FooterLayout
      className={cn("", {
        "ltr:xl:ml-[300px] rtl:xl:mr-[300px]": !collapsed,
        "ltr:xl:ml-[72px] rtl:xl:mr-[72px]": collapsed,
        "sticky bottom-0": footerType === "sticky",
      })}
    >
      <div className="block md:flex md:justify-between text-muted-foreground">
        <p className="sm:mb-0 text-xs md:text-sm">
          © {new Date().getFullYear()} سامانه ثبت عملکرد
        </p>
      </div>
    </FooterLayout>
  );
};

export default Footer;

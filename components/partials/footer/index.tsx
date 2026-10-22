"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/store";
import FooterLayout from "./footer-layout";

const Footer = () => {
  const { collapsed } = useSidebar();
  return (
    <FooterLayout
      className={cn("", {
        "ltr:xl:ml-[300px] rtl:xl:mr-[300px]": !collapsed,
        "ltr:xl:ml-[72px] rtl:xl:mr-[72px]": collapsed,
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

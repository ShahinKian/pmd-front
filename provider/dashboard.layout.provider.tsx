"use client";
import React from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/store";
import Header from "@/components/partials/header";
import Sidebar from "@/components/partials/sidebar";
import Footer from "@/components/partials/footer";
import { useMounted } from "@/hooks/use-mounted";

const DashBoardLayoutProvider = ({ children }: { children: React.ReactNode }) => {
  const { collapsed } = useSidebar();
  const location = usePathname();
  const mounted = useMounted();

  if (!mounted) {
    return <div className="h-screen flex items-center justify-center text-default-500">در حال بارگذاری...</div>;
  }

  return (
    <>
      <Header />
      <Sidebar trans={{}} />
      <div
        className={cn("content-wrapper transition-all duration-150", {
          "ltr:xl:ml-[300px] rtl:xl:mr-[300px]": !collapsed,
          "ltr:xl:ml-[72px] rtl:xl:mr-[72px]": collapsed,
        })}
      >
        <div className="layout-padding px-6 pt-6 page-min-height">
          <main key={location}>{children}</main>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default DashBoardLayoutProvider;

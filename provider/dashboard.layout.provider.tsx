"use client";

import React from "react";
import Header from "@/components/partials/header";
import Sidebar from "@/components/partials/sidebar";
import Footer from "@/components/partials/footer";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/store";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useMounted } from "@/hooks/use-mounted";

const DashBoardLayoutProvider = ({ children }: { children: React.ReactNode }) => {
  const { collapsed } = useSidebar();
  const location = usePathname();
  const mounted = useMounted();

  if (!mounted) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[#f6f7fb] text-sm text-default-500 dark:bg-background">
        در حال بارگذاری...
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#f6f7fb] dark:bg-background">
      <Sidebar trans={{}} />

      <div
        className={cn(
          "flex min-h-dvh min-w-0 flex-col transition-[margin] duration-300",
          collapsed ? "lg:mr-[76px]" : "lg:mr-[236px]",
        )}
      >
        <Header handleOpenSearch={() => {}} trans={{}} />

        <div className="flex min-w-0 flex-1 flex-col">
          <motion.main
            key={location}
            id="main-content"
            className="w-full min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-7 lg:py-7"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: "tween", ease: "easeInOut", duration: 0.2 }}
          >
            {children}
          </motion.main>
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default DashBoardLayoutProvider;

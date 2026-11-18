"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SESSION_EXPIRED_EVENT } from "@/lib/http/client";
import { ToastHost } from "@/components/ui/toast-host";
import DashBoardLayoutProvider from "@/provider/dashboard.layout.provider";

export default function ApplicationShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    function onSessionExpired() {
      if (window.location.pathname === "/login") return;
      const returnTo = window.location.pathname + window.location.search;
      router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
  }, [router]);

  if (pathname === "/login") return <>{children}</>;

  return (
    <DashBoardLayoutProvider>
      <ToastHost />
      {children}
    </DashBoardLayoutProvider>
  );
}

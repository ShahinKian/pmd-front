"use client";

import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import { ThemeProvider } from "next-themes";
import { apiFetcher } from "@/lib/http/client";

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" enableSystem={false} defaultTheme="light">
      <div
        className="dash-tail-app theme-violet min-h-screen"
        style={{ "--radius": "0.5rem" } as React.CSSProperties}
      >
        <SWRConfig
          value={{
            fetcher: apiFetcher,
            revalidateOnFocus: false,
            shouldRetryOnError: false,
            dedupingInterval: 1500,
          }}
        >
          {children}
        </SWRConfig>
      </div>
    </ThemeProvider>
  );
}

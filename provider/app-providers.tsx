"use client";

import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import { ThemeProvider } from "next-themes";
import { cn } from "@/lib/utils";
import { apiFetcher } from "@/lib/http/client";
import DirectionProvider from "@/provider/direction.provider";
import { useThemeStore } from "@/store";

export default function AppProviders({ children }: { children: ReactNode }) {
  const { theme, radius } = useThemeStore();

  return (
    <ThemeProvider attribute="class" enableSystem={false} defaultTheme="light">
      <div
        className={cn("dash-tail-app", "theme-" + theme)}
        style={{ "--radius": `${radius}rem` } as React.CSSProperties}
      >
        <DirectionProvider>
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
        </DirectionProvider>
      </div>
    </ThemeProvider>
  );
}

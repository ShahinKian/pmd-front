"use client";

import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import { apiFetcher } from "@/lib/http/client";

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
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
  );
}

"use client";
import { useEffect, useMemo } from "react";
import useSWR from "swr";
import { useSession } from "@/hooks/use-session";
import { getPmdMenus } from "@/config/menus";
import { apiClient } from "@/lib/http/client";
import type { PaginationMeta } from "@/lib/forecasts/types";

async function inboxCount(url: string): Promise<number> {
  const response = await apiClient.get(url);
  const pagination = JSON.parse(response.headers.pagination ?? "null") as PaginationMeta | null;
  if (!pagination || !Number.isSafeInteger(pagination.TotalCount) || pagination.TotalCount < 0) {
    throw new Error("Inbox pagination is missing or invalid.");
  }
  return pagination.TotalCount;
}

const countOptions = { refreshInterval: 30_000, revalidateOnFocus: true };

export function usePmdMenu() {
  const { data: session } = useSession();
  const { data: forecasts, mutate: refreshForecasts } = useSWR(
    session ? "/forecasts?pageNumber=1&pageSize=1" : null, inboxCount, countOptions,
  );
  const { data: profiles, mutate: refreshProfiles } = useSWR(
    session ? "/program-profiles?pageNumber=1&pageSize=1" : null, inboxCount, countOptions,
  );

  useEffect(() => {
    if (!session) return;
    const interceptor = apiClient.interceptors.response.use(response => {
      const method = response.config.method?.toLowerCase();
      const path = (response.config.url ?? "").split("?")[0];
      if (["post", "put", "patch", "delete"].includes(method ?? "")
        && /^\/(forecasts|program-profiles)(\/|$)/.test(path)
        && !/^\/program-profiles\/drafts(\/|$)/.test(path)) {
        void refreshForecasts();
        void refreshProfiles();
      }
      return response;
    });
    return () => apiClient.interceptors.response.eject(interceptor);
  }, [session, refreshForecasts, refreshProfiles]);

  return useMemo(
    () => getPmdMenus(session, session ? { forecasts, profiles } : {}),
    [session, forecasts, profiles],
  );
}

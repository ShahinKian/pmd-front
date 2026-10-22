"use client";
import { useMemo } from "react";
import { useSession } from "@/hooks/use-session";
import { getPmdMenus } from "@/config/menus";

export function usePmdMenu() {
  const { data: session } = useSession();
  return useMemo(() => getPmdMenus(session), [session]);
}

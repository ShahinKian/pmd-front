"use client";

import useSWR from "swr";
import type { UserProfileResponse } from "@/lib/auth/types";

export interface SessionPayload {
  user: UserProfileResponse;
  isSystemAdmin: boolean;
  roleLabels: string[];
}

export function useSession() {
  return useSWR<SessionPayload>("/auth/session");
}

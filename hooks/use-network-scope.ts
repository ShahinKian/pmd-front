"use client";

import useSWR from "swr";
import type { SessionPayload } from "@/hooks/use-session";
import type { EnrichedProviderPlan } from "@/lib/plan-providers/types";

function validNetworkId(id: number | null): id is number {
  return id !== null && Number.isSafeInteger(id) && id > 0 && id <= 2147483647;
}

export function useNetworkScope(session?: SessionPayload | null, adminSelection = "") {
  const assigned = session?.user.networkIds?.find(validNetworkId);
  const providerWithoutNetwork = Boolean(session && !session.isSystemAdmin && !assigned && session.user.roles.includes("Providers"));
  const providerPlans = useSWR<EnrichedProviderPlan[]>(providerWithoutNetwork ? "/plan-providers/my/plans/enriched" : null, {
    revalidateOnFocus: false,
  });
  const providerNetwork = providerPlans.data?.map((plan) => plan.networkId).filter(validNetworkId).sort((left, right) => left - right)[0];
  const id = assigned ?? providerNetwork;

  return {
    networkId: session?.isSystemAdmin ? adminSelection : id ? String(id) : "",
    loading: providerWithoutNetwork && providerPlans.isLoading,
  };
}

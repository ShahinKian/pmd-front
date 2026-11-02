export interface PlanProviderLink {
  planId: number;
  providerId: number;
  assignedAt: string;
}

export interface EnrichedProviderPlan extends PlanProviderLink {
  title: string;
  networkId: number | null;
  networkGroupId: number | null;
}

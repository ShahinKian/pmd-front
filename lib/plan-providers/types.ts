export interface PlanProviderLink {
  planId: number;
  providerId: number;
  assignedAt: string;
}

export interface EnrichedProviderPlan extends PlanProviderLink {
  title: string;
}

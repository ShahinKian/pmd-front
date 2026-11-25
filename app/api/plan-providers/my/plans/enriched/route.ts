import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authenticatedPmdFetch } from "@/lib/auth/request";
import { readUpstreamBody } from "@/lib/auth/upstream";
import { baseInfoService } from "@/lib/base-info/service";
import type { BaseInfoItem } from "@/lib/base-info/types";
import { currentTehranDate, readPlanPeriod } from "@/lib/base-info/plan-period";
import type { ActiveProviderPlans, PlanProviderLink } from "@/lib/plan-providers/types";

type ResolvedPlan = {
  title: string;
  networkId: number;
  networkGroupId: number;
  period: ReturnType<typeof readPlanPeriod>;
};

function positiveInt(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function resolvePlanNames(planIds: number[]): Promise<Map<number, ResolvedPlan>> {
  const unresolved = new Set(planIds);
  const resolved = new Map<number, ResolvedPlan>();

  if (unresolved.size === 0) return resolved;

  const networksResponse = await baseInfoService.getNetworks();
  const networks = Array.isArray(networksResponse.Data) ? networksResponse.Data : [];

  for (const network of networks) {
    if (unresolved.size === 0) break;

    const networkId = positiveInt(network.Value);
    if (!networkId || network.Disabled) continue;

    let groups: BaseInfoItem[] = [];
    try {
      const groupsResponse = await baseInfoService.getNetworkGroups(networkId);
      groups = Array.isArray(groupsResponse.Data) ? groupsResponse.Data : [];
    } catch {
      continue;
    }

    const groupIds = groups.flatMap((group) => {
      const id = positiveInt(group.Value);
      return id && !group.Disabled ? [id] : [];
    });
    const batchSize = 4;
    for (let start = 0; start < groupIds.length && unresolved.size; start += batchSize) {
      const batch = groupIds.slice(start, start + batchSize);
      const results = await Promise.allSettled(batch.map((groupId) => baseInfoService.getPlans(networkId, groupId)));

      for (const [index, result] of results.entries()) {
        if (result.status === "rejected") continue;
        for (const plan of result.value.Data) {
          const planId = positiveInt(plan.Value);
          if (!planId || !unresolved.delete(planId)) continue;

          resolved.set(planId, {
            title: plan.Text?.trim() || "نام برنامه در دسترس نیست",
            networkId,
            networkGroupId: batch[index],
            period: readPlanPeriod(plan, planId),
          });
        }
      }
    }
  }

  return resolved;
}

export async function GET(request: NextRequest) {
  const { response } = await authenticatedPmdFetch(
    request,
    "/api/plan-providers/my/plans",
  );

  if (!response.ok) {
    const body = await readUpstreamBody(response);
    return NextResponse.json(body, { status: response.status });
  }

  const body = await readUpstreamBody(response);
  const links = Array.isArray(body) ? body as PlanProviderLink[] : [];

  let resolved = new Map<number, ResolvedPlan>();
  try {
    resolved = await resolvePlanNames([...new Set(links.map(link => link.planId))]);
  } catch {
    // صفحه همچنان پاسخ می‌دهد؛ فقط موارد resolve نشده پیام مناسب خواهند داشت.
  }

  const enriched = links.map(link => {
    const plan = resolved.get(link.planId);
    return {
      ...link,
      title: plan?.title ?? "نام برنامه در دسترس نیست",
      networkId: plan?.networkId ?? null,
      networkGroupId: plan?.networkGroupId ?? null,
    };
  });

  if (request.nextUrl.searchParams.get("activeOnly") !== "true")
    return NextResponse.json(enriched);

  const today = currentTehranDate();
  const result: ActiveProviderPlans = { plans: [], scheduleUnavailableCount: 0 };
  const batchSize = 6;
  for (let offset = 0; offset < enriched.length; offset += batchSize) {
    const batch = enriched.slice(offset, offset + batchSize);
    const periods = await Promise.allSettled(batch.map(async plan =>
      resolved.get(plan.planId)?.period ?? readPlanPeriod((await baseInfoService.getPlanDetail(plan.planId)).Data, plan.planId)));
    for (const [index, response] of periods.entries()) {
      if (response.status === "rejected" || !response.value) {
        result.scheduleUnavailableCount++;
      } else if (response.value.startDate <= today && today <= response.value.endDate) {
        result.plans.push({ ...batch[index], ...response.value });
      }
    }
  }

  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}

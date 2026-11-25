import type { NextRequest } from "next/server";
import { authenticatedBaseInfoRoute } from "@/lib/base-info/auth-route";
import { positiveRouteId } from "@/lib/base-info/route";
import { readEstimateHeader } from "@/lib/base-info/estimate";
import { baseInfoService } from "@/lib/base-info/service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
) {
  return authenticatedBaseInfoRoute(request, async () => {
    const { planId } = await params;
    const id = positiveRouteId(planId, "planId");
    const result = await baseInfoService.getEstimate(id);
    return { ...result, Data: readEstimateHeader(result.Data, id) };
  });
}

import type { NextRequest } from "next/server";
import { authenticatedBaseInfoRoute } from "@/lib/base-info/auth-route";
import { positiveRouteId } from "@/lib/base-info/route";
import { baseInfoService } from "@/lib/base-info/service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
) {
  return authenticatedBaseInfoRoute(request, async () => {
    const { planId } = await params;
    return baseInfoService.getPlanItems(positiveRouteId(planId, "planId"));
  });
}

import type { NextRequest } from "next/server";
import { authenticatedBaseInfoRoute } from "@/lib/base-info/auth-route";
import { BaseInfoError } from "@/lib/base-info/types";
import { positiveRouteId } from "@/lib/base-info/route";
import { baseInfoService } from "@/lib/base-info/service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ networkId: string }> },
) {
  return authenticatedBaseInfoRoute(request, async () => {
    const { networkId } = await params;
    const networkGroupId = request.nextUrl.searchParams.get("networkGroupId");
    if (!networkGroupId) throw new BaseInfoError("BAD_REQUEST", "networkGroupId is required.", 400);
    return baseInfoService.getPlans(positiveRouteId(networkId, "networkId"), positiveRouteId(networkGroupId, "networkGroupId"));
  });
}

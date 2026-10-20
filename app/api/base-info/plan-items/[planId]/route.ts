import { baseInfoRoute, positiveRouteId } from "@/lib/base-info/route";
import { baseInfoService } from "@/lib/base-info/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ planId: string }> },
) {
  return baseInfoRoute(async () => {
    const { planId } = await params;
    return baseInfoService.getPlanItems(positiveRouteId(planId, "planId"));
  });
}

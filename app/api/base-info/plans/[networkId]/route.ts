import { baseInfoRoute, positiveRouteId } from "@/lib/base-info/route";
import { baseInfoService } from "@/lib/base-info/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ networkId: string }> },
) {
  return baseInfoRoute(async () => {
    const { networkId } = await params;
    return baseInfoService.getPlans(positiveRouteId(networkId, "networkId"));
  });
}

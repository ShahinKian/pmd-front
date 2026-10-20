import { baseInfoRoute, positiveRouteId } from "@/lib/base-info/route";
import { baseInfoService } from "@/lib/base-info/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ structureId: string }> },
) {
  return baseInfoRoute(async () => {
    const { structureId } = await params;
    return baseInfoService.getProgramDegrees(positiveRouteId(structureId, "structureId"));
  });
}

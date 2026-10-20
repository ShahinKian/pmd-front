import { baseInfoRoute, positiveRouteId } from "@/lib/base-info/route";
import { baseInfoService } from "@/lib/base-info/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  return baseInfoRoute(async () => {
    const { jobId } = await params;
    return baseInfoService.getActivityTypes(positiveRouteId(jobId, "jobId"));
  });
}

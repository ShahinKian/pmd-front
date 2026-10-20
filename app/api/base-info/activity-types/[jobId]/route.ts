import type { NextRequest } from "next/server";
import { authenticatedBaseInfoRoute } from "@/lib/base-info/auth-route";
import { positiveRouteId } from "@/lib/base-info/route";
import { baseInfoService } from "@/lib/base-info/service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  return authenticatedBaseInfoRoute(request, async () => {
    const { jobId } = await params;
    return baseInfoService.getActivityTypes(positiveRouteId(jobId, "jobId"));
  });
}

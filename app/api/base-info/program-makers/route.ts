import type { NextRequest } from "next/server";
import { BaseInfoError } from "@/lib/base-info/types";
import { baseInfoRoute, positiveRouteId } from "@/lib/base-info/route";
import { baseInfoService } from "@/lib/base-info/service";

export async function GET(request: NextRequest) {
  return baseInfoRoute(() => {
    const jobId = request.nextUrl.searchParams.get("jobId");
    const networkId = request.nextUrl.searchParams.get("networkId");

    if (!jobId || !networkId) {
      throw new BaseInfoError("BAD_REQUEST", "jobId and networkId are required.", 400);
    }

    return baseInfoService.getProgramMakers(
      positiveRouteId(jobId, "jobId"),
      positiveRouteId(networkId, "networkId"),
    );
  });
}

import type { NextRequest } from "next/server";
import { authenticatedBaseInfoRoute } from "@/lib/base-info/auth-route";
import { positiveRouteId } from "@/lib/base-info/route";
import { baseInfoService } from "@/lib/base-info/service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ structureId: string }> },
) {
  return authenticatedBaseInfoRoute(request, async () => {
    const { structureId } = await params;
    return baseInfoService.getProgramDegrees(positiveRouteId(structureId, "structureId"));
  });
}

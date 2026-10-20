import type { NextRequest } from "next/server";
import { authenticatedBaseInfoRoute } from "@/lib/base-info/auth-route";
import { baseInfoService } from "@/lib/base-info/service";

export async function GET(request: NextRequest) {
  return authenticatedBaseInfoRoute(request, () => baseInfoService.getBusinessTypes());
}

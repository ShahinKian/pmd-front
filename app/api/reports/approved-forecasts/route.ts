import type { NextRequest } from "next/server";
import { authenticatedPmdFetch } from "@/lib/auth/request";
import { proxyJsonResponse } from "@/lib/auth/route";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.toString();
  const { response } = await authenticatedPmdFetch(
    request,
    `/api/reports/approved-forecasts${query ? `?${query}` : ""}`,
  );
  return proxyJsonResponse(response);
}

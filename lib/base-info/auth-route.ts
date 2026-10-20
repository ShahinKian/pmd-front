import type { NextRequest } from "next/server";
import type { BaseInfoResponse } from "./types";
import { baseInfoRoute } from "./route";
import { authenticatedPmdFetch } from "@/lib/auth/request";
import { proxyJsonResponse } from "@/lib/auth/route";

export async function authenticatedBaseInfoRoute<T>(
  request: NextRequest,
  operation: () => Promise<BaseInfoResponse<T>>,
) {
  const auth = await authenticatedPmdFetch(request, "/api/auth/me");
  if (!auth.response.ok) {
    return proxyJsonResponse(auth.response);
  }

  return baseInfoRoute(operation);
}

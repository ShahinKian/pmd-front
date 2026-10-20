import type { NextRequest } from "next/server";
import { authenticatedPmdFetch } from "@/lib/auth/request";
import { proxyJsonResponse } from "@/lib/auth/route";

export async function GET(request: NextRequest) {
  const { response, rotatedAuth } = await authenticatedPmdFetch(
    request,
    "/api/auth/roles",
  );
  return proxyJsonResponse(response, rotatedAuth);
}

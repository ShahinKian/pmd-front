import type { NextRequest } from "next/server";
import { authenticatedPmdFetch } from "@/lib/auth/request";
import { proxyJsonResponse } from "@/lib/auth/route";

export async function GET(request: NextRequest) {
  const { response } = await authenticatedPmdFetch(request, request.nextUrl.searchParams.has("registry") ? "/api/workflows/form-registry" : request.nextUrl.searchParams.has("fields") ? "/api/workflows/field-catalog" : "/api/workflows/actions");
  return proxyJsonResponse(response);
}

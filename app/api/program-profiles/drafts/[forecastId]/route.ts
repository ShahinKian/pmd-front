import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authenticatedPmdFetch } from "@/lib/auth/request";
import { proxyJsonResponse } from "@/lib/auth/route";
import { isSameOriginRequest } from "@/lib/auth/security";

type Context = { params: Promise<{ forecastId: string }> };

export async function GET(request: NextRequest, context: Context) {
  const { forecastId } = await context.params;
  const { response } = await authenticatedPmdFetch(request, `/api/program-profiles/drafts/${forecastId}`);
  return proxyJsonResponse(response);
}

export async function PUT(request: NextRequest, context: Context) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ message: "درخواست نامعتبر است." }, { status: 403 });
  }
  const { forecastId } = await context.params;
  const body = await request.text();
  const { response } = await authenticatedPmdFetch(
    request,
    `/api/program-profiles/drafts/${forecastId}`,
    { method: "PUT", body, headers: { "Content-Type": "application/json" } },
  );
  return proxyJsonResponse(response);
}

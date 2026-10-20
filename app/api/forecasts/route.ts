import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authenticatedPmdFetch } from "@/lib/auth/request";
import { isSameOriginRequest } from "@/lib/auth/security";
import { proxyWithPagination } from "@/lib/http/pagination";
import { proxyJsonResponse } from "@/lib/auth/route";

export async function GET(request: NextRequest) {
  const upstreamQuery = new URLSearchParams();
  const allowed = ["planId","status","fromDate","toDate","pageNumber","pageSize"];

  for (const key of allowed) {
    const value = request.nextUrl.searchParams.get(key);
    if (value !== null && value !== "") upstreamQuery.set(key, value);
  }

  const suffix = upstreamQuery.toString() ? `?${upstreamQuery.toString()}` : "";
  const { response } = await authenticatedPmdFetch(
    request,
    `/api/forecasts${suffix}`,
  );
  return proxyWithPagination(response);
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ message: "درخواست نامعتبر است." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "بدنه درخواست معتبر نیست." }, { status: 400 });
  }

  const { response } = await authenticatedPmdFetch(
    request,
    "/api/forecasts",
    { method: "POST", body: JSON.stringify(body) },
  );
  return proxyJsonResponse(response);
}

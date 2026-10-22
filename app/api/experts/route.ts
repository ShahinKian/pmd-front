import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authenticatedPmdFetch } from "@/lib/auth/request";
import { proxyWithPagination } from "@/lib/http/pagination";
import { proxyJsonResponse } from "@/lib/auth/route";
import { isSameOriginRequest } from "@/lib/auth/security";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.toString();
  const { response } = await authenticatedPmdFetch(request, `/api/experts${query ? `?${query}` : ""}`);
  return proxyWithPagination(response);
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ message: "درخواست نامعتبر است." }, { status: 403 });
  const body = await request.text();
  const { response } = await authenticatedPmdFetch(request, "/api/experts", { method: "POST", body });
  return proxyJsonResponse(response);
}

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authenticatedPmdFetch } from "@/lib/auth/request";
import { proxyJsonResponse } from "@/lib/auth/route";
import { isSameOriginRequest } from "@/lib/auth/security";

export async function GET(request: NextRequest) {
  const { response } = await authenticatedPmdFetch(request, "/api/auth/profile");
  return proxyJsonResponse(response);
}

export async function PUT(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ message: "درخواست نامعتبر است." }, { status: 403 });
  }

  const body = await request.text();
  const { response } = await authenticatedPmdFetch(
    request,
    "/api/auth/profile",
    { method: "PUT", body },
  );
  return proxyJsonResponse(response);
}

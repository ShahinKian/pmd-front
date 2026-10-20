import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  applyAuthCookies,
  clearAuthCookies,
} from "@/lib/auth/cookies";
import { isSameOriginRequest } from "@/lib/auth/security";
import type { AuthResponse } from "@/lib/auth/types";
import { readUpstreamBody } from "@/lib/auth/upstream";
import { pmdFetch } from "@/lib/pmd-api/client";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ message: "درخواست نامعتبر است." }, { status: 403 });
  }

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!accessToken || !refreshToken) {
    const response = NextResponse.json({ message: "نشست معتبر نیست." }, { status: 401 });
    clearAuthCookies(response);
    return response;
  }

  const upstream = await pmdFetch("/api/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ accessToken, refreshToken }),
  });

  const payload = await readUpstreamBody(upstream);
  if (!upstream.ok) {
    const response = NextResponse.json(payload, { status: upstream.status });
    clearAuthCookies(response);
    return response;
  }

  const auth = payload as AuthResponse;
  const response = NextResponse.json({
    userName: auth.userName,
    expiresAt: auth.expiresAt,
    roles: auth.roles,
    networkIds: auth.networkIds,
    networkGroupId: auth.networkGroupId,
    providerId: auth.providerId,
  });

  applyAuthCookies(response, auth);
  return response;
}

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { applyAuthCookies } from "@/lib/auth/cookies";
import { isSameOriginRequest } from "@/lib/auth/security";
import type { AuthResponse } from "@/lib/auth/types";
import { readUpstreamBody } from "@/lib/auth/upstream";
import { pmdFetch } from "@/lib/pmd-api/client";

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

  const upstream = await pmdFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });

  const payload = await readUpstreamBody(upstream);
  if (!upstream.ok) {
    return NextResponse.json(payload, { status: upstream.status });
  }

  const auth = payload as AuthResponse;
  if (!auth?.accessToken || !auth?.refreshToken) {
    return NextResponse.json(
      { message: "پاسخ سرویس ورود معتبر نیست." },
      { status: 502 },
    );
  }

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

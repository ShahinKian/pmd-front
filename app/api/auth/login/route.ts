import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { applyAuthCookies } from "@/lib/auth/cookies";
import { isSameOriginRequest } from "@/lib/auth/security";
import type { AuthResponse } from "@/lib/auth/types";
import { readUpstreamBody } from "@/lib/auth/upstream";
import { pmdFetch } from "@/lib/pmd-api/client";
import { clearCaptchaCookie, verifyCaptcha } from "@/lib/auth/captcha";

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

  const data = body as Record<string, unknown>;
  const captcha = typeof data.captcha === "string" ? data.captcha : "";

  if (!verifyCaptcha(request, captcha)) {
    const response = NextResponse.json(
      { message: "کد امنیتی صحیح نیست یا منقضی شده است." },
      { status: 400 },
    );
    clearCaptchaCookie(response);
    return response;
  }

  const upstream = await pmdFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      userName: data.userName,
      password: data.password,
    }),
  });

  const payload = await readUpstreamBody(upstream);
  if (!upstream.ok) {
    const response = NextResponse.json(payload, { status: upstream.status });
    clearCaptchaCookie(response);
    return response;
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
  clearCaptchaCookie(response);
  return response;
}

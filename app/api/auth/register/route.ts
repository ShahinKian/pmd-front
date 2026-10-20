import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authenticatedPmdFetch } from "@/lib/auth/request";
import { isSameOriginRequest } from "@/lib/auth/security";
import type { AuthResponse, RegisterRequest } from "@/lib/auth/types";
import { readUpstreamBody } from "@/lib/auth/upstream";
import { clearAuthCookies } from "@/lib/auth/cookies";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ message: "درخواست نامعتبر است." }, { status: 403 });
  }

  let body: RegisterRequest;
  try {
    body = (await request.json()) as RegisterRequest;
  } catch {
    return NextResponse.json({ message: "بدنه درخواست معتبر نیست." }, { status: 400 });
  }

  const { response: upstream } = await authenticatedPmdFetch(
    request,
    "/api/auth/register",
    { method: "POST", body: JSON.stringify(body) },
  );

  const payload = await readUpstreamBody(upstream);
  if (!upstream.ok) {
    const response = NextResponse.json(payload, { status: upstream.status });
    if (upstream.status === 401) clearAuthCookies(response);
    return response;
  }

  // Register returns JWTs for the newly created user. Never replace the current
  // administrator session and never expose those tokens to the browser.
  const created = payload as AuthResponse;
  return NextResponse.json({
    userName: created.userName,
    roles: created.roles,
    networkIds: created.networkIds,
    networkGroupId: created.networkGroupId,
    providerId: created.providerId,
  });
}

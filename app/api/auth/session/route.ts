import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { applyAuthCookies, clearAuthCookies } from "@/lib/auth/cookies";
import { authenticatedPmdFetch } from "@/lib/auth/request";
import { isSystemAdmin, roleLabel } from "@/lib/auth/roles";
import type { UserProfileResponse } from "@/lib/auth/types";
import { readUpstreamBody } from "@/lib/auth/upstream";

export async function GET(request: NextRequest) {
  const { response: upstream, rotatedAuth } = await authenticatedPmdFetch(
    request,
    "/api/auth/profile",
  );

  const body = await readUpstreamBody(upstream);
  if (!upstream.ok) {
    const response = NextResponse.json(body, { status: upstream.status });
    if (upstream.status === 401) clearAuthCookies(response);
    return response;
  }

  const profile = body as UserProfileResponse;
  const response = NextResponse.json({
    user: profile,
    isSystemAdmin: isSystemAdmin(profile.roles),
    roleLabels: profile.roles.map(roleLabel),
  });

  if (rotatedAuth) applyAuthCookies(response, rotatedAuth);
  return response;
}

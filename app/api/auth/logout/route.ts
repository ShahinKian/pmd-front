import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  clearAuthCookies,
} from "@/lib/auth/cookies";
import { isSameOriginRequest } from "@/lib/auth/security";
import { pmdFetch } from "@/lib/pmd-api/client";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ message: "درخواست نامعتبر است." }, { status: 403 });
  }

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  if (accessToken && refreshToken) {
    try {
      await pmdFetch(
        "/api/auth/revoke",
        {
          method: "POST",
          body: JSON.stringify({ accessToken, refreshToken }),
        },
        accessToken,
      );
    } catch {
      // Local logout must still succeed if the backend is temporarily unreachable.
    }
  }

  const response = new NextResponse(null, { status: 204 });
  clearAuthCookies(response);
  return response;
}

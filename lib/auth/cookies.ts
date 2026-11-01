import type { NextResponse } from "next/server";
import type { AuthResponse } from "./types";

export const ACCESS_TOKEN_COOKIE = "pmd_access_token";
export const REFRESH_TOKEN_COOKIE = "pmd_refresh_token";

function common(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
  };
}

export function applyAuthCookies(response: NextResponse, auth: AuthResponse, secure: boolean): void {
  // Keep both tokens as session cookies. The backend refresh contract needs the
  // expired access token in the refresh body, so deleting the cookie exactly at
  // JWT expiry would make refresh impossible.
  response.cookies.set(ACCESS_TOKEN_COOKIE, auth.accessToken, common(secure));
  response.cookies.set(REFRESH_TOKEN_COOKIE, auth.refreshToken, common(secure));
}

export function clearAuthCookies(response: NextResponse, secure = false): void {
  response.cookies.set(ACCESS_TOKEN_COOKIE, "", { ...common(secure), expires: new Date(0) });
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", { ...common(secure), expires: new Date(0) });
}

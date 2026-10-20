import type { NextResponse } from "next/server";
import type { AuthResponse } from "./types";

export const ACCESS_TOKEN_COOKIE = "pmd_access_token";
export const REFRESH_TOKEN_COOKIE = "pmd_refresh_token";

const common = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export function applyAuthCookies(response: NextResponse, auth: AuthResponse): void {
  const expiresAt = new Date(auth.expiresAt);
  response.cookies.set(ACCESS_TOKEN_COOKIE, auth.accessToken, {
    ...common,
    expires: Number.isNaN(expiresAt.getTime()) ? undefined : expiresAt,
  });

  // Backend does not expose refresh-token expiry, so keep it as a browser-session cookie.
  response.cookies.set(REFRESH_TOKEN_COOKIE, auth.refreshToken, common);
}

export function clearAuthCookies(response: NextResponse): void {
  response.cookies.set(ACCESS_TOKEN_COOKIE, "", { ...common, expires: new Date(0) });
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", { ...common, expires: new Date(0) });
}

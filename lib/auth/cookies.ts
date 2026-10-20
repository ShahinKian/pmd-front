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
  // Keep both tokens as session cookies. The backend refresh contract needs the
  // expired access token in the refresh body, so deleting the cookie exactly at
  // JWT expiry would make refresh impossible.
  response.cookies.set(ACCESS_TOKEN_COOKIE, auth.accessToken, common);
  response.cookies.set(REFRESH_TOKEN_COOKIE, auth.refreshToken, common);
}

export function clearAuthCookies(response: NextResponse): void {
  response.cookies.set(ACCESS_TOKEN_COOKIE, "", { ...common, expires: new Date(0) });
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", { ...common, expires: new Date(0) });
}

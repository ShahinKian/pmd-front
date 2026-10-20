import type { NextRequest } from "next/server";
import { pmdFetch } from "@/lib/pmd-api/client";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "./cookies";
import type { AuthResponse } from "./types";

export interface AuthenticatedFetchResult {
  response: Response;
  rotatedAuth?: AuthResponse;
}

function isAuthResponse(value: unknown): value is AuthResponse {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.userName === "string" &&
    typeof v.accessToken === "string" &&
    typeof v.refreshToken === "string" &&
    typeof v.expiresAt === "string" &&
    Array.isArray(v.roles) &&
    Array.isArray(v.networkIds)
  );
}

async function refreshTokens(
  accessToken: string,
  refreshToken: string,
): Promise<AuthResponse | null> {
  const response = await pmdFetch("/api/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ accessToken, refreshToken }),
  });

  if (!response.ok) return null;

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return null;
  }

  return isAuthResponse(payload) ? payload : null;
}

export async function authenticatedPmdFetch(
  request: NextRequest,
  path: string,
  init: RequestInit = {},
): Promise<AuthenticatedFetchResult> {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    return {
      response: new Response(null, { status: 401 }),
    };
  }

  let response = await pmdFetch(path, init, accessToken);
  if (response.status !== 401 || !refreshToken) {
    return { response };
  }

  const rotatedAuth = await refreshTokens(accessToken, refreshToken);
  if (!rotatedAuth) {
    return { response };
  }

  response = await pmdFetch(path, init, rotatedAuth.accessToken);
  return { response, rotatedAuth };
}

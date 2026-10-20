import { NextResponse } from "next/server";
import { applyAuthCookies, clearAuthCookies } from "./cookies";
import type { AuthResponse } from "./types";
import { readUpstreamBody } from "./upstream";

export async function proxyJsonResponse(
  upstream: Response,
  rotatedAuth?: AuthResponse,
): Promise<NextResponse> {
  const body = await readUpstreamBody(upstream);
  const response =
    upstream.status === 204
      ? new NextResponse(null, { status: 204 })
      : NextResponse.json(body, { status: upstream.status });

  if (rotatedAuth) applyAuthCookies(response, rotatedAuth);
  if (upstream.status === 401 && !rotatedAuth) clearAuthCookies(response);

  return response;
}

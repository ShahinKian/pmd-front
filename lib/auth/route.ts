import { NextResponse } from "next/server";
import { clearAuthCookies } from "./cookies";
import { readUpstreamBody } from "./upstream";

export async function proxyJsonResponse(upstream: Response): Promise<NextResponse> {
  const body = await readUpstreamBody(upstream);
  const response =
    upstream.status === 204
      ? new NextResponse(null, { status: 204 })
      : NextResponse.json(body, { status: upstream.status });

  if (upstream.status === 401) clearAuthCookies(response);
  return response;
}

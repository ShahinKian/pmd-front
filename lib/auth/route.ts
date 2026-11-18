import { NextResponse } from "next/server";
import { readUpstreamBody } from "./upstream";

export async function proxyJsonResponse(upstream: Response): Promise<NextResponse> {
  // Preserve both cookies on 401 so the client can use the backend refresh contract.
  const body = await readUpstreamBody(upstream);
  const response =
    upstream.status === 204
      ? new NextResponse(null, { status: 204 })
      : NextResponse.json(body, { status: upstream.status });

  return response;
}

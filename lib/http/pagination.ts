import { NextResponse } from "next/server";
import { readUpstreamBody } from "@/lib/auth/upstream";
import { clearAuthCookies } from "@/lib/auth/cookies";

export async function proxyWithPagination(upstream: Response): Promise<NextResponse> {
  const body = await readUpstreamBody(upstream);
  const response =
    upstream.status === 204
      ? new NextResponse(null, { status: 204 })
      : NextResponse.json(body, { status: upstream.status });

  const pagination = upstream.headers.get("Pagination");
  if (pagination) response.headers.set("Pagination", pagination);

  if (upstream.status === 401) clearAuthCookies(response);
  return response;
}

import { NextResponse } from "next/server";

export async function readUpstreamBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export function upstreamResponse(
  body: unknown,
  status: number,
  extra?: Record<string, unknown>,
): NextResponse {
  if (status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  if (body && typeof body === "object" && !Array.isArray(body)) {
    return NextResponse.json({ ...(body as Record<string, unknown>), ...extra }, { status });
  }

  return NextResponse.json(extra ? { data: body, ...extra } : body, { status });
}

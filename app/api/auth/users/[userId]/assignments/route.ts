import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authenticatedPmdFetch } from "@/lib/auth/request";
import { proxyJsonResponse } from "@/lib/auth/route";
import { isSameOriginRequest } from "@/lib/auth/security";

function validGuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ message: "درخواست نامعتبر است." }, { status: 403 });
  }

  const { userId } = await params;
  if (!validGuid(userId)) {
    return NextResponse.json({ message: "شناسه کاربر معتبر نیست." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "بدنه درخواست معتبر نیست." }, { status: 400 });
  }

  const payload = body && typeof body === "object" ? body as Record<string, unknown> : {};
  if (payload.userId !== userId) {
    return NextResponse.json({ message: "شناسه کاربر در مسیر و بدنه یکسان نیست." }, { status: 400 });
  }

  const { response } = await authenticatedPmdFetch(
    request,
    `/api/auth/users/${encodeURIComponent(userId)}/assignments`,
    { method: "PUT", body: JSON.stringify(payload) },
  );
  return proxyJsonResponse(response);
}

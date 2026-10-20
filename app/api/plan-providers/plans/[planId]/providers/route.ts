import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authenticatedPmdFetch } from "@/lib/auth/request";
import { proxyJsonResponse } from "@/lib/auth/route";
import { isSameOriginRequest } from "@/lib/auth/security";

function positiveId(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
) {
  const { planId } = await params;
  const id = positiveId(planId);
  if (!id) {
    return NextResponse.json({ message: "شناسه طرح معتبر نیست." }, { status: 400 });
  }

  const { response } = await authenticatedPmdFetch(
    request,
    `/api/plan-providers/plans/${id}/providers`,
  );
  return proxyJsonResponse(response);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ message: "درخواست نامعتبر است." }, { status: 403 });
  }

  const { planId } = await params;
  const id = positiveId(planId);
  if (!id) {
    return NextResponse.json({ message: "شناسه طرح معتبر نیست." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "بدنه درخواست معتبر نیست." }, { status: 400 });
  }

  const payload = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const providerIds = Array.isArray(payload.providerIds) ? payload.providerIds : [];
  const normalized = Array.from(
    new Set(
      providerIds
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0),
    ),
  );

  if (normalized.length === 0 || normalized.length > 500) {
    return NextResponse.json(
      { message: "حداقل یک تهیه‌کننده معتبر و حداکثر ۵۰۰ مورد انتخاب کنید." },
      { status: 400 },
    );
  }

  const { response } = await authenticatedPmdFetch(
    request,
    `/api/plan-providers/plans/${id}/providers`,
    {
      method: "POST",
      body: JSON.stringify({ providerIds: normalized }),
    },
  );
  return proxyJsonResponse(response);
}

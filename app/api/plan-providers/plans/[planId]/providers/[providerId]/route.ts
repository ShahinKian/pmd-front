import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authenticatedPmdFetch } from "@/lib/auth/request";
import { proxyJsonResponse } from "@/lib/auth/route";
import { isSameOriginRequest } from "@/lib/auth/security";

function positiveId(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; providerId: string }> },
) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ message: "درخواست نامعتبر است." }, { status: 403 });
  }

  const { planId, providerId } = await params;
  const validPlanId = positiveId(planId);
  const validProviderId = positiveId(providerId);

  if (!validPlanId || !validProviderId) {
    return NextResponse.json({ message: "شناسه طرح یا تهیه‌کننده معتبر نیست." }, { status: 400 });
  }

  const { response } = await authenticatedPmdFetch(
    request,
    `/api/plan-providers/plans/${validPlanId}/providers/${validProviderId}`,
    { method: "DELETE" },
  );
  return proxyJsonResponse(response);
}

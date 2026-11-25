import { NextResponse, type NextRequest } from "next/server";
import { authenticatedPmdFetch } from "@/lib/auth/request";
import { proxyJsonResponse } from "@/lib/auth/route";

export async function GET(request: NextRequest, { params }: { params: Promise<{ estimateId: string }> }) {
  const { estimateId } = await params;
  const forecastId = request.nextUrl.searchParams.get("forecastId");
  if (!/^\d+$/.test(estimateId) || !forecastId || !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(forecastId)) {
    return NextResponse.json({ message: "شناسه برآورد یا پیش‌بینی معتبر نیست." }, { status: 400 });
  }
  const { response } = await authenticatedPmdFetch(
    request, `/api/program-profiles/estimates/${estimateId}/broadcast-count?forecastId=${forecastId}`,
  );
  return proxyJsonResponse(response);
}

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authenticatedPmdFetch } from "@/lib/auth/request";
import { proxyJsonResponse } from "@/lib/auth/route";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> },
) {
  const { programId } = await params;
  const id = Number(programId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ message: "شناسه طرح معتبر نیست." }, { status: 400 });
  }

  const { response } = await authenticatedPmdFetch(
    request,
    `/api/forecasts/next-episode-number/${id}`,
  );
  return proxyJsonResponse(response);
}

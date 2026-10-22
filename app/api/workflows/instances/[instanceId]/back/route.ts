import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authenticatedPmdFetch } from "@/lib/auth/request";
import { proxyJsonResponse } from "@/lib/auth/route";
import { isSameOriginRequest } from "@/lib/auth/security";

export async function POST(request: NextRequest, { params }: { params: Promise<{ instanceId: string }> }) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ message: "درخواست نامعتبر است." }, { status: 403 });
  const { instanceId } = await params;
  const body = await request.text();
  const { response } = await authenticatedPmdFetch(request, `/api/workflows/instances/${instanceId}/back`, { method: "POST", body });
  return proxyJsonResponse(response);
}

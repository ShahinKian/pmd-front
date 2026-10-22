import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authenticatedPmdFetch } from "@/lib/auth/request";
import { proxyJsonResponse } from "@/lib/auth/route";
import { isSameOriginRequest } from "@/lib/auth/security";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ message: "درخواست نامعتبر است." }, { status: 403 });
  const { id } = await params;
  const { response } = await authenticatedPmdFetch(request, `/api/workflows/${id}/revisions`, { method: "POST" });
  return proxyJsonResponse(response);
}

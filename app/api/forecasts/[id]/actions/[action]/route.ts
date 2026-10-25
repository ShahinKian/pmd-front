import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authenticatedPmdFetch } from "@/lib/auth/request";
import { proxyJsonResponse } from "@/lib/auth/route";
import { isSameOriginRequest } from "@/lib/auth/security";

export async function POST(request: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> }) {
  if (!isSameOriginRequest(request))
    return NextResponse.json({ message: "درخواست نامعتبر است." }, { status: 403 });
  const { id, action } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[a-z0-9-]{1,100}$/.test(action))
    return NextResponse.json({ message: "شناسه یا اقدام نامعتبر است." }, { status: 400 });
  const body = await request.text();
  const { response } = await authenticatedPmdFetch(request,
    `/api/forecasts/${id}/actions/${action}`, { method: "POST", body });
  return proxyJsonResponse(response);
}

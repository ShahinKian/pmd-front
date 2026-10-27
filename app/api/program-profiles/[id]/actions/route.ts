import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authenticatedPmdFetch } from "@/lib/auth/request";
import { proxyJsonResponse } from "@/lib/auth/route";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id))
    return NextResponse.json({ message: "شناسه نامعتبر است." }, { status: 400 });
  const { response } = await authenticatedPmdFetch(request, `/api/program-profiles/${id}/actions`);
  return proxyJsonResponse(response);
}

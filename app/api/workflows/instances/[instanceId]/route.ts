import type { NextRequest } from "next/server";
import { authenticatedPmdFetch } from "@/lib/auth/request";
import { proxyJsonResponse } from "@/lib/auth/route";

export async function GET(request: NextRequest, { params }: { params: Promise<{ instanceId: string }> }) {
  const { instanceId } = await params;
  const { response } = await authenticatedPmdFetch(request, `/api/workflows/instances/${instanceId}`);
  return proxyJsonResponse(response);
}

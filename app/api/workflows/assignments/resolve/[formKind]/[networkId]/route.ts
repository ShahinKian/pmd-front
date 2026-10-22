import type { NextRequest } from "next/server";
import { authenticatedPmdFetch } from "@/lib/auth/request";
import { proxyJsonResponse } from "@/lib/auth/route";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ formKind: string; networkId: string }> },
) {
  const { formKind, networkId } = await params;
  const { response } = await authenticatedPmdFetch(
    request,
    `/api/workflows/assignments/resolve/${formKind}/${networkId}`,
  );
  return proxyJsonResponse(response);
}

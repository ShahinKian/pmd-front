import type { NextRequest } from "next/server";
import { authenticatedPmdFetch } from "@/lib/auth/request";
import { proxyJsonResponse } from "@/lib/auth/route";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ formTypeId: string; networkId: string }> },
) {
  const { formTypeId, networkId } = await params;
  const { response } = await authenticatedPmdFetch(
    request,
    "/api/workflows/assignments/resolve/" + formTypeId + "/" + networkId,
  );
  return proxyJsonResponse(response);
}

import type { NextRequest } from "next/server";
import { pmdFetch } from "@/lib/pmd-api/client";
import { ACCESS_TOKEN_COOKIE } from "./cookies";

export interface AuthenticatedFetchResult {
  response: Response;
}

export async function authenticatedPmdFetch(
  request: NextRequest,
  path: string,
  init: RequestInit = {},
): Promise<AuthenticatedFetchResult> {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    return { response: new Response(null, { status: 401 }) };
  }

  return {
    response: await pmdFetch(path, init, accessToken),
  };
}

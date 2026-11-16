import type { NextRequest } from "next/server";
import { authenticatedPmdFetch } from "@/lib/auth/request";
import { proxyJsonResponse } from "@/lib/auth/route";
import { proxyRoleMutation } from "./mutation";

export async function GET(request: NextRequest) {
  const { response } = await authenticatedPmdFetch(request, "/api/auth/roles");
  return proxyJsonResponse(response);
}

export async function POST(request: NextRequest) {
  return proxyRoleMutation(request, "/api/auth/roles", "POST");
}

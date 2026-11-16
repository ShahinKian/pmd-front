import { NextResponse, type NextRequest } from "next/server";
import { authenticatedPmdFetch } from "@/lib/auth/request";
import { proxyJsonResponse } from "@/lib/auth/route";
import { isSameOriginRequest } from "@/lib/auth/security";

export async function proxyRoleMutation(request: NextRequest, path: string, method: "POST" | "PUT" | "DELETE") {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ message: "درخواست نامعتبر است." }, { status: 403 });
  }

  let body: string | undefined;
  if (method !== "DELETE") {
    try {
      body = JSON.stringify(await request.json());
    } catch {
      return NextResponse.json({ message: "بدنه درخواست معتبر نیست." }, { status: 400 });
    }
  }

  const { response } = await authenticatedPmdFetch(request, path, { method, body });
  return proxyJsonResponse(response);
}

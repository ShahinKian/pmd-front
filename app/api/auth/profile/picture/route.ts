import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authenticatedPmdFetch } from "@/lib/auth/request";
import { proxyJsonResponse } from "@/lib/auth/route";
import { isSameOriginRequest } from "@/lib/auth/security";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ message: "درخواست نامعتبر است." }, { status: 403 });
  }

  const incoming = await request.formData();
  const file = incoming.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "فایل تصویر ارسال نشده است." }, { status: 400 });
  }

  const formData = new FormData();
  formData.set("file", file);

  const { response } = await authenticatedPmdFetch(
    request,
    "/api/auth/profile/picture",
    { method: "POST", body: formData },
  );

  return proxyJsonResponse(response);
}

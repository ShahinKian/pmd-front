import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authenticatedPmdFetch } from "@/lib/auth/request";
import { isSameOriginRequest } from "@/lib/auth/security";
import type { AuthResponse, RegisterRequest } from "@/lib/auth/types";
import { readUpstreamBody } from "@/lib/auth/upstream";
import { clearAuthCookies } from "@/lib/auth/cookies";
import { pmdFetch } from "@/lib/pmd-api/client";

async function parseRegisterRequest(request: NextRequest): Promise<{
  body: RegisterRequest;
  picture: File | null;
}> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const payload = formData.get("payload");
    const picture = formData.get("picture");

    if (typeof payload !== "string") {
      throw new Error("REGISTER_BODY");
    }

    return {
      body: JSON.parse(payload) as RegisterRequest,
      picture: picture instanceof File && picture.size > 0 ? picture : null,
    };
  }

  return {
    body: (await request.json()) as RegisterRequest,
    picture: null,
  };
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ message: "درخواست نامعتبر است." }, { status: 403 });
  }

  let body: RegisterRequest;
  let picture: File | null;

  try {
    ({ body, picture } = await parseRegisterRequest(request));
  } catch {
    return NextResponse.json({ message: "بدنه درخواست معتبر نیست." }, { status: 400 });
  }

  const { response: upstream } = await authenticatedPmdFetch(
    request,
    "/api/auth/register",
    { method: "POST", body: JSON.stringify(body) },
  );

  const payload = await readUpstreamBody(upstream);
  if (!upstream.ok) {
    const response = NextResponse.json(payload, { status: upstream.status });
    if (upstream.status === 401) clearAuthCookies(response);
    return response;
  }

  const created = payload as AuthResponse;
  let profilePictureUrl: string | null = null;
  let pictureUploadWarning: string | null = null;

  if (picture) {
    const pictureFormData = new FormData();
    pictureFormData.set("file", picture);

    const pictureResponse = await pmdFetch(
      "/api/auth/profile/picture",
      { method: "POST", body: pictureFormData },
      created.accessToken,
    );

    if (pictureResponse.ok) {
      const pictureBody = await readUpstreamBody(pictureResponse);
      if (pictureBody && typeof pictureBody === "object") {
        const value = (pictureBody as Record<string, unknown>).profilePictureUrl;
        profilePictureUrl = typeof value === "string" ? value : null;
      }
    } else {
      pictureUploadWarning =
        "کاربر ایجاد شد اما ثبت عکس پروفایل انجام نشد. عکس را بعداً از پروفایل کاربر ثبت کنید.";
    }
  }

  return NextResponse.json({
    userName: created.userName,
    roles: created.roles,
    networkIds: created.networkIds,
    networkGroupId: created.networkGroupId,
    providerId: created.providerId,
    profilePictureUrl,
    pictureUploadWarning,
  });
}

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  applyCaptchaCookie,
  createCaptchaChallenge,
} from "@/lib/auth/captcha";
import { isSecureRequest } from "@/lib/auth/security";
import { renderCaptchaPng } from "@/lib/auth/captcha-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const challenge = createCaptchaChallenge();
  const png = renderCaptchaPng(challenge.expression);

  const response = new NextResponse(new Uint8Array(png), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, no-store, no-cache, max-age=0, must-revalidate",
      "X-Content-Type-Options": "nosniff",
      Pragma: "no-cache",
    },
  });

  applyCaptchaCookie(response, challenge.cookieValue, isSecureRequest(request));
  return response;
}

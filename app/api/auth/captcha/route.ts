import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  applyCaptchaCookie,
  createCaptchaChallenge,
} from "@/lib/auth/captcha";
import { isSecureRequest } from "@/lib/auth/security";
import { renderCaptchaSvg } from "@/lib/auth/captcha-image";

export async function GET(request: NextRequest) {
  const challenge = createCaptchaChallenge();
  const svg = renderCaptchaSvg(challenge.expression);

  const response = new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  });

  applyCaptchaCookie(response, challenge.cookieValue, isSecureRequest(request));
  return response;
}

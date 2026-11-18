import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  applyCaptchaCookie,
  createCaptchaChallenge,
} from "@/lib/auth/captcha";
import { isSecureRequest } from "@/lib/auth/security";
import { renderCaptchaSvg } from "@/lib/auth/captcha-image";
import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const challenge = createCaptchaChallenge();
  const svg = renderCaptchaSvg(challenge.expression);
  const png = await sharp(Buffer.from(svg)).png().toBuffer();

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

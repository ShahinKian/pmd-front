import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import {
  applyCaptchaCookie,
  createCaptchaChallenge,
} from "@/lib/auth/captcha";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function GET() {
  const challenge = createCaptchaChallenge();

  const rotations = [-8, 6, -3, 7, -5, 4, -6, 3, -4, 5];
  const chars = Array.from(challenge.expression);

  const glyphs = chars
    .map((char, index) => {
      const x = 24 + index * 22;
      const y = 43 + randomInt(-3, 4);
      const rotate = rotations[index % rotations.length];
      return (
        '<text x="' + x + '" y="' + y + '" transform="rotate(' + rotate + " " + x + " " + y + ')" ' +
        'font-family="Tahoma, Arial, sans-serif" font-size="24" font-weight="700" fill="currentColor">' +
        escapeXml(char) +
        "</text>"
      );
    })
    .join("");

  const lines = Array.from({ length: 7 }, (_, index) => {
    const y1 = randomInt(8, 58);
    const y2 = randomInt(8, 58);
    const opacity = 0.12 + (index % 3) * 0.05;
    return (
      '<line x1="4" y1="' + y1 + '" x2="236" y2="' + y2 + '" ' +
      'stroke="currentColor" stroke-width="1.4" opacity="' + opacity + '" />'
    );
  }).join("");

  const dots = Array.from({ length: 28 }, () => {
    const cx = randomInt(4, 236);
    const cy = randomInt(4, 62);
    const r = randomInt(1, 3);
    return (
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="currentColor" opacity="0.15" />'
    );
  }).join("");

  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="66" viewBox="0 0 240 66" ' +
    'style="color:#6d28d9;background:#f8f7ff">' +
    '<rect width="240" height="66" rx="10" fill="#f8f7ff" />' +
    lines +
    dots +
    glyphs +
    "</svg>";

  const response = new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  });

  applyCaptchaCookie(response, challenge.cookieValue);
  return response;
}

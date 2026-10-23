import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

export const CAPTCHA_COOKIE = "pmd_login_captcha";
const CAPTCHA_TTL_SECONDS = 5 * 60;

function getCaptchaSecret(): string {
  const secret = process.env.CAPTCHA_SECRET?.trim();
  if (secret) return secret;

  if (process.env.NODE_ENV !== "production") {
    return "pmd-development-captcha-secret-change-me";
  }

  throw new Error("CAPTCHA_SECRET is required in production.");
}

function sign(nonce: string, expiresAt: number, answer: string): string {
  return createHmac("sha256", getCaptchaSecret())
    .update(nonce + ":" + expiresAt + ":" + answer)
    .digest("hex");
}

export function createCaptchaChallenge(): {
  expression: string;
  cookieValue: string;
  expiresAt: number;
} {
  const operator = randomInt(0, 2) === 0 ? "+" : "-";
  let left = randomInt(2, 10);
  let right = randomInt(1, 10);

  if (operator === "-" && right > left) {
    [left, right] = [right, left];
  }

  const answer = String(operator === "+" ? left + right : left - right);
  const nonce = randomBytes(18).toString("hex");
  const expiresAt = Math.floor(Date.now() / 1000) + CAPTCHA_TTL_SECONDS;
  const signature = sign(nonce, expiresAt, answer);

  return {
    expression: left + " " + operator + " " + right + " = ?",
    cookieValue: nonce + "." + expiresAt + "." + signature,
    expiresAt,
  };
}

export function verifyCaptcha(request: NextRequest, answer: string): boolean {
  const value = request.cookies.get(CAPTCHA_COOKIE)?.value;
  if (!value) return false;

  const [nonce, expiresRaw, signature] = value.split(".");
  const expiresAt = Number(expiresRaw);

  if (
    !nonce ||
    !signature ||
    !Number.isFinite(expiresAt) ||
    Math.floor(Date.now() / 1000) > expiresAt
  ) {
    return false;
  }

  const normalizedAnswer = answer.trim();
  if (!/^-?\d{1,3}$/.test(normalizedAnswer)) return false;

  const expected = sign(nonce, expiresAt, normalizedAnswer);

  try {
    const left = Buffer.from(signature, "hex");
    const right = Buffer.from(expected, "hex");
    return left.length === right.length && timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

export function applyCaptchaCookie(response: NextResponse, value: string): void {
  response.cookies.set(CAPTCHA_COOKIE, value, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth",
    maxAge: CAPTCHA_TTL_SECONDS,
  });
}

export function clearCaptchaCookie(response: NextResponse): void {
  response.cookies.set(CAPTCHA_COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth",
    expires: new Date(0),
  });
}

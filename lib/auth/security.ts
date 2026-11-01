import type { NextRequest } from "next/server";

function requestOrigin(request: NextRequest): string | null {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host")?.trim();
  if (!host) return null;

  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  const proto = forwardedProto || request.nextUrl.protocol.replace(":", "") || "http";

  return `${proto}://${host}`;
}

export function isSameOriginRequest(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const expectedOrigin = requestOrigin(request);

  if (origin && expectedOrigin && origin !== expectedOrigin) return false;

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return false;

  return true;
}

export function isSecureRequest(request: NextRequest): boolean {
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  if (forwardedProto) return forwardedProto === "https";
  return request.nextUrl.protocol === "https:";
}

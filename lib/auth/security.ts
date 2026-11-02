import type { NextRequest } from "next/server";

function normalizeHost(value: string | null): string | null {
  const host = value?.split(",")[0]?.trim().toLowerCase();
  return host || null;
}

function hostFromUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return null;
  }
}

function requestHosts(request: NextRequest): string[] {
  const hosts = [
    normalizeHost(request.headers.get("x-forwarded-host")),
    normalizeHost(request.headers.get("host")),
  ].filter((value): value is string => Boolean(value));

  return [...new Set(hosts)];
}

export function isSameOriginRequest(request: NextRequest): boolean {
  const fetchSite = request.headers.get("sec-fetch-site")?.trim().toLowerCase();

  if (fetchSite === "same-origin") return true;
  if (fetchSite === "cross-site") return false;

  const originHost = hostFromUrl(request.headers.get("origin"));
  const refererHost = hostFromUrl(request.headers.get("referer"));
  const hosts = requestHosts(request);

  if (originHost && hosts.includes(originHost)) return true;

  // IIS/ARR can rewrite Host before the request reaches Next.js. In that case,
  // Origin and Referer still reflect the browser-facing address (IP/domain).
  if (originHost && refererHost && originHost === refererHost) return true;

  // Non-browser/internal requests may omit Origin entirely.
  if (!originHost) return true;

  return false;
}

export function isSecureRequest(request: NextRequest): boolean {
  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();

  if (forwardedProto) return forwardedProto === "https";

  if (request.headers.get("x-arr-ssl")) return true;

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).protocol === "https:";
    } catch {
      // Fall through to Referer/Next URL.
    }
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).protocol === "https:";
    } catch {
      // Fall through to the upstream URL.
    }
  }

  return request.nextUrl.protocol === "https:";
}

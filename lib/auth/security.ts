import type { NextRequest } from "next/server";

function normalizeHost(value: string | null): string | null {
  const host = value?.split(",")[0]?.trim().toLowerCase();
  return host || null;
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

  // Browser-generated same-origin requests are safe even when IIS/ARR rewrites
  // the upstream scheme/host to 127.0.0.1:3000.
  if (fetchSite === "same-origin") return true;
  if (fetchSite === "cross-site") return false;

  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const originHost = new URL(origin).host.toLowerCase();
    const hosts = requestHosts(request);

    if (hosts.includes(originHost)) return true;

    // If the browser reports same-site, still require an explicit host match.
    // This prevents a sibling subdomain from being treated as same-origin.
    return false;
  } catch {
    return false;
  }
}

export function isSecureRequest(request: NextRequest): boolean {
  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();

  if (forwardedProto) return forwardedProto === "https";

  // IIS ARR commonly adds X-ARR-SSL for HTTPS requests terminated at IIS.
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

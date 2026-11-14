import { getPmdApiBaseUrl } from "./config";

const DEFAULT_TIMEOUT_MS = 15_000;

export async function pmdFetch(
  path: string,
  init: RequestInit = {},
  accessToken?: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  if (!path.startsWith("/api/")) {
    throw new Error("PMD API path must start with /api/.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new DOMException("PMD request timed out", "TimeoutError")), timeoutMs);
  const signal = init.signal ? AbortSignal.any([controller.signal, init.signal]) : controller.signal;
  const headers = new Headers(init.headers);

  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  try {
    return await fetch(`${getPmdApiBaseUrl()}${path}`, {
      ...init,
      headers,
      cache: "no-store",
      signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

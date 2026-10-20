import { getPmdApiBaseUrl } from "./config";

const DEFAULT_TIMEOUT_MS = 15_000;

export async function pmdFetch(
  path: string,
  init: RequestInit = {},
  accessToken?: string,
): Promise<Response> {
  if (!path.startsWith("/api/")) {
    throw new Error("PMD API path must start with /api/.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
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
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

import { BaseInfoError, type BaseInfoResponse } from "./types";

const DEFAULT_TIMEOUT_MS = 10_000;

function getBaseInfoConfig() {
  const baseUrl = process.env.BASEINFO_BASE_URL?.trim().replace(/\/+$/, "");
  const apiKey = process.env.BASEINFO_API_KEY?.trim();
  const configuredTimeout = Number(process.env.BASEINFO_TIMEOUT_MS);
  const timeoutMs =
    Number.isInteger(configuredTimeout) && configuredTimeout > 0
      ? configuredTimeout
      : DEFAULT_TIMEOUT_MS;

  if (!baseUrl || !apiKey) {
    throw new BaseInfoError("CONFIGURATION", "Base Info service is not configured.", 503);
  }

  return { baseUrl, apiKey, timeoutMs };
}

function isBaseInfoResponse<T>(value: unknown): value is BaseInfoResponse<T> {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.IsSuccess === "boolean" && "Message" in candidate && "Data" in candidate;
}

export async function baseInfoGet<T>(
  relativePath: string,
  query?: URLSearchParams,
  validateData?: (data: unknown) => data is T,
): Promise<BaseInfoResponse<T>> {
  const { baseUrl, apiKey, timeoutMs } = getBaseInfoConfig();

  if (!relativePath || relativePath.startsWith("/") || relativePath.includes("..")) {
    throw new BaseInfoError("BAD_REQUEST", "Invalid Base Info path.", 400);
  }

  const url = new URL(`${baseUrl}/${relativePath}`);
  query?.forEach((value, key) => url.searchParams.set(key, value));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new BaseInfoError("TIMEOUT", "Base Info request timed out.", 504);
    }
    throw new BaseInfoError("NETWORK", "Base Info service is unreachable.", 502);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    if (response.status === 400) throw new BaseInfoError("BAD_REQUEST", "Base Info rejected the request.", 400);
    if (response.status === 401) throw new BaseInfoError("UNAUTHORIZED", "Base Info credentials were rejected.", 502);
    throw new BaseInfoError("UPSTREAM", "Base Info service returned an error.", 502);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new BaseInfoError("INVALID_RESPONSE", "Base Info returned invalid JSON.", 502);
  }

  if (!isBaseInfoResponse<T>(payload)) {
    throw new BaseInfoError("INVALID_RESPONSE", "Base Info response contract is invalid.", 502);
  }

  if (!payload.IsSuccess) {
    throw new BaseInfoError("UPSTREAM", payload.Message?.trim() || "Base Info operation failed.", 502);
  }

  if (validateData && !validateData(payload.Data)) {
    throw new BaseInfoError("INVALID_RESPONSE", "Base Info Data shape is invalid.", 502);
  }

  return payload;
}

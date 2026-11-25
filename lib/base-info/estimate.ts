import { BaseInfoError } from "./types";

export type EstimateHeader = {
  id: number;
  planId: number;
  organizationCode: string | null;
  partNumber: number | null;
};

function integer(value: unknown): number | null {
  const number = typeof value === "string" && /^\d+$/.test(value.trim()) ? Number(value) : value;
  return typeof number === "number" && Number.isSafeInteger(number) && number >= 0 && number <= 2147483647
    ? number : null;
}

export function readEstimateHeader(data: unknown, planId: number): EstimateHeader {
  const candidates = Array.isArray(data) ? data : [data];
  const matches = candidates.flatMap(candidate => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return [];
    const fields = Object.fromEntries(Object.entries(candidate).map(([key, value]) => [key.toLowerCase(), value]));
    const id = integer(fields.id);
    if (!id || integer(fields.planid) !== planId) return [];
    const code = fields.estimateorganizationcode;
    const organizationCode = typeof code === "string" || (typeof code === "number" && Number.isSafeInteger(code))
      ? String(code).trim() || null : null;
    return [{ id, planId, organizationCode, partNumber: integer(fields.partnumber) }];
  });

  if (matches.length !== 1) {
    throw new BaseInfoError("INVALID_RESPONSE", "No unique estimate header for the selected plan.", 502);
  }
  return matches[0];
}

import type { NextRequest } from "next/server";
import { baseInfoService } from "@/lib/base-info/service";
import { BaseInfoError } from "@/lib/base-info/types";
import { pmdFetch } from "@/lib/pmd-api/client";
import type { PermitIssuePreparation } from "@/lib/certificate/types";

const guid = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i;
const noStore = { "Cache-Control": "no-store" };

function positiveId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 && value <= 2147483647;
}

function fields(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BaseInfoError("INVALID_RESPONSE", "ساختار اطلاعات برآورد معتبر نیست.", 502);
  }
  return value as Record<string, unknown>;
}

class SourceFailure extends Error {
  constructor(readonly code: string, readonly status: number, readonly planId?: number, readonly field?: string) {
    super(code);
  }
}

class EstimateFieldError extends Error {
  constructor(readonly field: string) { super(field); }
}

function optionalInteger(value: unknown, field: string): number | null {
  if (value == null || (typeof value === "string" && !value.trim())) return null;
  const parsed = typeof value === "string" && /^\d+$/.test(value.trim()) ? Number(value.trim()) : value;
  if (parsed === 0 || positiveId(parsed)) return parsed;
  throw new EstimateFieldError(field);
}

function requiredId(value: unknown, field: string): number {
  const id = optionalInteger(value, field);
  if (!positiveId(id)) throw new EstimateFieldError(field);
  return id;
}

function optionalText(value: unknown, field: string): string | null {
  if (value == null) return null;
  if (typeof value !== "string") throw new EstimateFieldError(field);
  return value.trim() || null;
}

function calculatedRate(value: unknown): string {
  const text = typeof value === "string" ? value.trim()
    : typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER ? String(value)
    : "";
  const match = /^(\d+)(?:\.(\d+))?$/.exec(text);
  if (!match) throw new EstimateFieldError("Calculated");
  const whole = match[1].replace(/^0+(?=\d)/, "");
  const fraction = (match[2] ?? "").replace(/0+$/, "");
  if (whole.length > 16 || fraction.length > 2) throw new EstimateFieldError("Calculated");
  return fraction ? `${whole}.${fraction}` : whole;
}

async function readEstimate<T>(planId: number, part: "EstimateHeader" | "EstimateDetail", request: () => Promise<T>) {
  try {
    return await request();
  } catch (error) {
    if (error instanceof EstimateFieldError) throw new SourceFailure(part, 502, planId, error.field);
    if (error instanceof BaseInfoError) {
      if (error.code === "CONFIGURATION") throw new SourceFailure("BaseInfoConfiguration", 503);
      if (error.code === "UNAUTHORIZED") throw new SourceFailure("BaseInfoUnauthorized", 502);
      if (error.code === "TIMEOUT") throw new SourceFailure(part, 504, planId);
    }
    throw new SourceFailure(part, 502, planId);
  }
}

function failure(code: string, status: number, planId?: number, field?: string) {
  return Response.json({ code, planId, field }, { status, headers: noStore });
}

async function getEstimates(networkId: number, planIds: number[]) {
  const estimates = [];
  for (let offset = 0; offset < planIds.length; offset += 6) {
    const batch = await Promise.all(planIds.slice(offset, offset + 6).map(async (planId) => {
      const [header, rates] = await Promise.all([
        readEstimate(planId, "EstimateHeader", async () => {
          const data = fields((await baseInfoService.getEstimate(planId)).Data);
          if (requiredId(data.PlanId, "PlanId") !== planId) throw new EstimateFieldError("PlanId");
          if (requiredId(data.NetworkId, "NetworkId") !== networkId) throw new EstimateFieldError("NetworkId");
          const planName = optionalText(data.PlanName, "PlanName");
          if (!planName) throw new EstimateFieldError("PlanName");
          const organizationCode = data.EstimateOrganizationCode;
          return {
            id: requiredId(data.Id, "Id"), planId, networkId, planName,
            estimateOrganizationCode: typeof organizationCode === "number" && Number.isSafeInteger(organizationCode)
              ? String(organizationCode) : optionalText(organizationCode, "EstimateOrganizationCode"),
            partNumber: optionalInteger(data.PartNumber, "PartNumber"),
            networkGroupId: optionalInteger(data.NetworkGroupId, "NetworkGroupId") || null,
            networkGroupName: optionalText(data.NetworkGroupName, "NetworkGroupName"),
          };
        }),
        readEstimate(planId, "EstimateDetail", async () => {
          const { Data } = await baseInfoService.getEstimateDetail(planId);
          if (!Array.isArray(Data)) throw new EstimateFieldError("Data");
          const rates = [];
          for (const row of Data) {
            const data = fields(row);
            if (!Object.hasOwn(data, "PersonnelId")) throw new EstimateFieldError("PersonnelId");
            const personnelId = optionalInteger(data.PersonnelId, "PersonnelId");
            // Unassigned estimate lines cannot match an attending crew member.
            if (!personnelId) continue;
            rates.push({
              id: requiredId(data.Id, "Id"),
              estimateId: requiredId(data.EstimateId, "EstimateId"),
              personnelId,
              activityTypeId: requiredId(data.ActivityTypeId, "ActivityTypeId"),
              calculated: calculatedRate(data.Calculated),
              bussinessTypeId: optionalInteger(data.BussinessTypeId, "BussinessTypeId") || null,
            });
          }
          return rates;
        }),
      ]);
      return { ...header, rates };
    }));
    estimates.push(...batch);
  }
  return estimates;
}

export async function POST(request: NextRequest) {
  const token = /^Bearer ([^\s,]+)$/i.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token) return failure("AccessDenied", 401);

  const selection: { networkId?: unknown; periodId?: unknown; jobId?: unknown; personnelId?: unknown } | null =
    await request.json().catch(() => null);
  if (!positiveId(selection?.networkId)) return failure("InvalidRequest", 400);

  const { networkId, periodId, jobId, personnelId } = selection;
  const networkPath = `/api/certificate/networks/${networkId}`;
  const init = { signal: request.signal, redirect: "error" as const };

  try {
    if (typeof periodId === "string" && guid.test(periodId)) {
      const response = await pmdFetch(`${networkPath}/periods/${periodId}/issue`, init, token);
      if (!response.ok) return failure([401, 403].includes(response.status) ? "AccessDenied" : "PreparationUnavailable", response.status);

      const preparation = await response.json() as PermitIssuePreparation;
      if (!Array.isArray(preparation.planIds) || !preparation.planIds.every(positiveId)) {
        return failure("PreparationUnavailable", 502);
      }

      const estimates = preparation.alreadyIssued ? [] : await getEstimates(networkId, preparation.planIds);
      return Response.json(estimates, { headers: noStore });
    }

    if (!positiveId(jobId) || !positiveId(personnelId)) {
      return failure("InvalidRequest", 400);
    }

    const response = await pmdFetch(`${networkPath}/duty-crew`, init, token);
    if (!response.ok) return failure([401, 403].includes(response.status) ? "AccessDenied" : "PreparationUnavailable", response.status);
    await response.body?.cancel();

    const makers = await baseInfoService.getProgramMakers(jobId, networkId);
    const name = makers.Data.find((item) => item.Disabled === false && Number(item.Value) === personnelId)?.Text.trim();
    if (!name || name.length > 200) return failure("CrewNotEligible", 404);
    return Response.json(name, { headers: noStore });
  } catch (error) {
    if (error instanceof SourceFailure) return failure(error.code, error.status, error.planId, error.field);
    if (error instanceof BaseInfoError) {
      if (error.code === "CONFIGURATION") return failure("BaseInfoConfiguration", 503);
      if (error.code === "UNAUTHORIZED") return failure("BaseInfoUnauthorized", 502);
      return failure("CrewSourceUnavailable", error.status === 504 ? 504 : 502);
    }
    return failure("PreparationUnavailable", error instanceof Error && error.name === "TimeoutError" ? 504 : 502);
  }
}

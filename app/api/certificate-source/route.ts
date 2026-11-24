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

async function getEstimates(networkId: number, profiles: PermitIssuePreparation["profiles"]) {
  const unique = new Map<string, PermitIssuePreparation["profiles"][number]>();
  for (const profile of profiles) {
    const key = `${profile.planId}:${profile.estimateId ?? 0}`;
    if (!unique.has(key)) unique.set(key, profile);
  }

  const selections = [...unique.values()];
  const estimates = [];
  for (let offset = 0; offset < selections.length; offset += 6) {
    const batch = await Promise.all(selections.slice(offset, offset + 6).map(async (profile) => {
      const planId = profile.planId;
      const [currentHeader, detailRows] = await Promise.all([
        readEstimate(planId, "EstimateHeader", async () => {
          const data = fields((await baseInfoService.getEstimate(planId)).Data);
          if (requiredId(data.PlanId, "PlanId") !== planId) throw new EstimateFieldError("PlanId");
          if (requiredId(data.NetworkId, "NetworkId") !== networkId) throw new EstimateFieldError("NetworkId");
          const planName = optionalText(data.PlanName, "PlanName");
          if (!planName) throw new EstimateFieldError("PlanName");
          return {
            currentId: requiredId(data.Id, "Id"),
            planName,
            networkGroupId: optionalInteger(data.NetworkGroupId, "NetworkGroupId") || null,
            networkGroupName: optionalText(data.NetworkGroupName, "NetworkGroupName"),
            currentOrganizationCode: typeof data.EstimateOrganizationCode === "number" && Number.isSafeInteger(data.EstimateOrganizationCode)
              ? String(data.EstimateOrganizationCode) : optionalText(data.EstimateOrganizationCode, "EstimateOrganizationCode"),
            currentPartNumber: optionalInteger(data.PartNumber, "PartNumber"),
          };
        }),
        readEstimate(planId, "EstimateDetail", async () => {
          const { Data } = await baseInfoService.getEstimateDetail(planId);
          if (!Array.isArray(Data)) throw new EstimateFieldError("Data");
          return Data;
        }),
      ]);

      const estimateId = positiveId(profile.estimateId) ? profile.estimateId : currentHeader.currentId;
      const rates = [];
      for (const row of detailRows) {
        const data = fields(row);
        const rowEstimateId = requiredId(data.EstimateId, "EstimateId");
        if (rowEstimateId !== estimateId) continue;
        if (!Object.hasOwn(data, "PersonnelId")) throw new EstimateFieldError("PersonnelId");
        const personnelId = optionalInteger(data.PersonnelId, "PersonnelId");
        if (!personnelId) continue;
        rates.push({
          id: requiredId(data.Id, "Id"),
          estimateId: rowEstimateId,
          personnelId,
          activityTypeId: requiredId(data.ActivityTypeId, "ActivityTypeId"),
          calculated: calculatedRate(data.Calculated),
          bussinessTypeId: optionalInteger(data.BussinessTypeId, "BussinessTypeId") || null,
        });
      }
      if (rates.length === 0) throw new SourceFailure("EstimateDetail", 502, planId, "EstimateId");

      return {
        id: estimateId,
        planId,
        networkId,
        planName: currentHeader.planName,
        estimateOrganizationCode: profile.estimateOrganizationCode?.trim() || currentHeader.currentOrganizationCode,
        partNumber: profile.estimatePartNumber ?? currentHeader.currentPartNumber,
        networkGroupId: currentHeader.networkGroupId,
        networkGroupName: currentHeader.networkGroupName,
        rates,
      };
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

      const estimates = preparation.alreadyIssued ? [] : await getEstimates(networkId, preparation.profiles);
      return Response.json(estimates, { headers: noStore });
    }

    if (!positiveId(jobId) || !positiveId(personnelId)) {
      return failure("InvalidRequest", 400);
    }

    const response = await pmdFetch(`${networkPath}/duty-crew`, init, token);
    if (!response.ok) return failure([401, 403].includes(response.status) ? "AccessDenied" : "PreparationUnavailable", response.status);
    await response.body?.cancel();

    const makers = await baseInfoService.getProgramMakers(jobId, networkId, { fresh: true });
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

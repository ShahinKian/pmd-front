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
  constructor(readonly code: string, readonly status: number, readonly planId?: number) {
    super(code);
  }
}

async function readEstimate<T>(planId: number, part: "EstimateHeader" | "EstimateDetail", request: () => Promise<T>) {
  try {
    return await request();
  } catch (error) {
    if (error instanceof BaseInfoError) {
      if (error.code === "CONFIGURATION") throw new SourceFailure("BaseInfoConfiguration", 503);
      if (error.code === "UNAUTHORIZED") throw new SourceFailure("BaseInfoUnauthorized", 502);
      if (error.code === "TIMEOUT") throw new SourceFailure(part, 504, planId);
    }
    throw new SourceFailure(part, 502, planId);
  }
}

function failure(code: string, status: number, planId?: number) {
  return Response.json({ code, planId }, { status, headers: noStore });
}

async function getEstimates(networkId: number, planIds: number[]) {
  const estimates = [];
  for (let offset = 0; offset < planIds.length; offset += 6) {
    const batch = await Promise.all(planIds.slice(offset, offset + 6).map(async (planId) => {
      const [header, rates] = await Promise.all([
        readEstimate(planId, "EstimateHeader", async () => {
          const data = fields((await baseInfoService.getEstimate(planId)).Data);
          if (Number(data.PlanId) !== planId || Number(data.NetworkId) !== networkId) {
            throw new SourceFailure("EstimateHeader", 502, planId);
          }
          return data;
        }),
        readEstimate(planId, "EstimateDetail", async () => {
          const { Data } = await baseInfoService.getEstimateDetail(planId);
          if (!Array.isArray(Data)) throw new SourceFailure("EstimateDetail", 502, planId);
          return Data.map((row: unknown) => {
            const { Id, EstimateId, PersonnelId, ActivityTypeId, Calculated, BussinessTypeId } = fields(row);
            return { id: Id, estimateId: EstimateId, personnelId: PersonnelId, activityTypeId: ActivityTypeId,
              calculated: Calculated, bussinessTypeId: BussinessTypeId };
          });
        }),
      ]);
      const { Id, PlanId, NetworkId, PlanName, EstimateOrganizationCode,
        PartNumber, NetworkGroupId, NetworkGroupName } = header;
      return { id: Id, planId: PlanId, networkId: NetworkId, planName: PlanName,
        estimateOrganizationCode: EstimateOrganizationCode, partNumber: PartNumber,
        networkGroupId: NetworkGroupId, networkGroupName: NetworkGroupName, rates };
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
    if (error instanceof SourceFailure) return failure(error.code, error.status, error.planId);
    if (error instanceof BaseInfoError) {
      if (error.code === "CONFIGURATION") return failure("BaseInfoConfiguration", 503);
      if (error.code === "UNAUTHORIZED") return failure("BaseInfoUnauthorized", 502);
      return failure("CrewSourceUnavailable", error.status === 504 ? 504 : 502);
    }
    return failure("PreparationUnavailable", error instanceof Error && error.name === "TimeoutError" ? 504 : 502);
  }
}

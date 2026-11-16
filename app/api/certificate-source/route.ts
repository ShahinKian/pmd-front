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

async function getEstimates(planIds: number[]) {
  const estimates = [];
  for (let offset = 0; offset < planIds.length; offset += 6) {
    const batch = await Promise.all(planIds.slice(offset, offset + 6).map(async (planId) => {
      const [estimate, detail] = await Promise.all([
        baseInfoService.getEstimate(planId),
        baseInfoService.getEstimateDetail(planId),
      ]);
      const { Id, PlanId, NetworkId, PlanName, EstimateOrganizationCode,
        PartNumber, NetworkGroupId, NetworkGroupName } = fields(estimate.Data);
      if (Number(PlanId) !== planId || !Array.isArray(detail.Data)) {
        throw new BaseInfoError("INVALID_RESPONSE", "اطلاعات برآورد با طرح درخواستی مطابقت ندارد.", 502);
      }
      const rates = detail.Data.map((row: unknown) => {
        const { Id, EstimateId, PersonnelId, ActivityTypeId, Calculated, BussinessTypeId } = fields(row);
        return { id: Id, estimateId: EstimateId, personnelId: PersonnelId, activityTypeId: ActivityTypeId,
          calculated: Calculated, bussinessTypeId: BussinessTypeId };
      });
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
  if (!token) return new Response(null, { status: 401, headers: noStore });

  const selection: { networkId?: unknown; periodId?: unknown; jobId?: unknown; personnelId?: unknown } | null =
    await request.json().catch(() => null);
  if (!positiveId(selection?.networkId)) return new Response(null, { status: 400, headers: noStore });

  const { networkId, periodId, jobId, personnelId } = selection;
  const networkPath = `/api/certificate/networks/${networkId}`;
  const init = { signal: request.signal, redirect: "error" as const };

  try {
    if (typeof periodId === "string" && guid.test(periodId)) {
      const response = await pmdFetch(`${networkPath}/periods/${periodId}/issue`, init, token);
      if (!response.ok) return new Response(null, { status: response.status, headers: noStore });

      const preparation = await response.json() as PermitIssuePreparation;
      if (!Array.isArray(preparation.planIds) || !preparation.planIds.every(positiveId)) {
        return new Response(null, { status: 502, headers: noStore });
      }

      const estimates = preparation.alreadyIssued ? [] : await getEstimates(preparation.planIds);
      return Response.json(estimates, { headers: noStore });
    }

    if (!positiveId(jobId) || !positiveId(personnelId)) {
      return new Response(null, { status: 400, headers: noStore });
    }

    const response = await pmdFetch(`${networkPath}/duty-crew`, init, token);
    if (!response.ok) return new Response(null, { status: response.status, headers: noStore });
    await response.body?.cancel();

    const makers = await baseInfoService.getProgramMakers(jobId, networkId);
    const name = makers.Data.find((item) => item.Disabled === false && Number(item.Value) === personnelId)?.Text.trim();
    if (!name || name.length > 200) return new Response(null, { status: 404, headers: noStore });
    return Response.json(name, { headers: noStore });
  } catch (error) {
    const timeout = error instanceof BaseInfoError ? error.status === 504 : error instanceof Error && error.name === "TimeoutError";
    return new Response(null, { status: timeout ? 504 : 502, headers: noStore });
  }
}

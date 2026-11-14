import { baseInfoService } from "@/lib/base-info/service";
import { BaseInfoError } from "@/lib/base-info/types";

function fields(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BaseInfoError("INVALID_RESPONSE", "ساختار اطلاعات برآورد معتبر نیست.", 502);
  }
  return value as Record<string, unknown>;
}

export async function getPermitEstimates(planIds: number[]) {
  const estimates = [];
  for (let offset = 0; offset < planIds.length; offset += 6) {
    const batch = await Promise.all(planIds.slice(offset, offset + 6).map(async (planId) => {
      const [estimate, detail] = await Promise.all([
        baseInfoService.getEstimate(planId),
        baseInfoService.getEstimateDetail(planId),
      ]);
      const { Id, PlanId, NetworkId, PlanName, EstimateOrganizationCode,
        PartNumber, NetworkGroupId, NetworkGroupName } = fields(estimate.Data);
      if (!Array.isArray(detail.Data)) {
        throw new BaseInfoError("INVALID_RESPONSE", "فهرست جزئیات برآورد معتبر نیست.", 502);
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

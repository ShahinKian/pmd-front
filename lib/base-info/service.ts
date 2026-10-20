import { baseInfoGet } from "./client";
import { baseInfoEndpoints } from "./endpoints";
import type { BaseInfoItem, BaseInfoResponse } from "./types";

export const baseInfoService = {
  getNetworks(): Promise<BaseInfoResponse<BaseInfoItem[]>> {
    return baseInfoGet(baseInfoEndpoints.networks());
  },
  getNetworkGroups(networkId: number): Promise<BaseInfoResponse<BaseInfoItem[]>> {
    return baseInfoGet(baseInfoEndpoints.networkGroups(networkId));
  },
  getStructurePrograms(): Promise<BaseInfoResponse<BaseInfoItem[]>> {
    return baseInfoGet(baseInfoEndpoints.structurePrograms());
  },
  getProgramDegrees(structureId: number): Promise<BaseInfoResponse<BaseInfoItem[]>> {
    return baseInfoGet(baseInfoEndpoints.programDegree(structureId));
  },
  getBusinessTypes(): Promise<BaseInfoResponse<BaseInfoItem[]>> {
    return baseInfoGet(baseInfoEndpoints.businessTypes());
  },
  getActivityTypes(jobId: number): Promise<BaseInfoResponse<BaseInfoItem[]>> {
    return baseInfoGet(baseInfoEndpoints.activityTypes(jobId));
  },
  getProgramMakers(jobId: number, networkId: number): Promise<BaseInfoResponse<BaseInfoItem[]>> {
    const query = new URLSearchParams({ jobId: String(jobId), networkId: String(networkId) });
    return baseInfoGet(baseInfoEndpoints.personnelProgramMaker(), query);
  },
  getPlans(networkId: number): Promise<BaseInfoResponse<unknown>> {
    return baseInfoGet(baseInfoEndpoints.plans(networkId));
  },
  getPlanDetail(planId: number): Promise<BaseInfoResponse<unknown>> {
    return baseInfoGet(baseInfoEndpoints.planDetail(planId));
  },
  getPlanItems(planId: number): Promise<BaseInfoResponse<unknown>> {
    return baseInfoGet(baseInfoEndpoints.planItems(planId));
  },
  getEstimateDetail(planId: number): Promise<BaseInfoResponse<unknown>> {
    return baseInfoGet(baseInfoEndpoints.estimateDetail(planId));
  },
};

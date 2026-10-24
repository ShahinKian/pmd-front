import { baseInfoGet } from "./client";
import { baseInfoEndpoints } from "./endpoints";
import type { BaseInfoItem, BaseInfoResponse } from "./types";

const isList = (value: unknown): value is BaseInfoItem[] => Array.isArray(value) && value.every((item) => item && typeof item === "object" && typeof item.Value === "string" && typeof item.Text === "string" && typeof item.Disabled === "boolean" && typeof item.Selected === "boolean");
const isDetail = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
const isRecords = (value: unknown): value is Record<string, unknown>[] => Array.isArray(value) && value.every((item) => item && typeof item === "object" && !Array.isArray(item));

export const baseInfoService = {
  getNetworks(): Promise<BaseInfoResponse<BaseInfoItem[]>> {
    return baseInfoGet(baseInfoEndpoints.networks(), undefined, isList);
  },
  getNetworkGroups(networkId: number): Promise<BaseInfoResponse<BaseInfoItem[]>> {
    return baseInfoGet(baseInfoEndpoints.networkGroups(networkId), undefined, isList);
  },
  getStructurePrograms(): Promise<BaseInfoResponse<BaseInfoItem[]>> {
    return baseInfoGet(baseInfoEndpoints.structurePrograms(), undefined, isList);
  },
  getProgramDegrees(structureId: number): Promise<BaseInfoResponse<BaseInfoItem[]>> {
    return baseInfoGet(baseInfoEndpoints.programDegree(structureId), undefined, isList);
  },
  getBusinessTypes(): Promise<BaseInfoResponse<BaseInfoItem[]>> {
    return baseInfoGet(baseInfoEndpoints.businessTypes(), undefined, isList);
  },
  getActivityTypes(jobId: number): Promise<BaseInfoResponse<BaseInfoItem[]>> {
    return baseInfoGet(baseInfoEndpoints.activityTypes(jobId), undefined, isList);
  },
  getProgramMakers(jobId: number, networkId: number): Promise<BaseInfoResponse<BaseInfoItem[]>> {
    const query = new URLSearchParams({ jobId: String(jobId), networkId: String(networkId) });
    return baseInfoGet(baseInfoEndpoints.personnelProgramMaker(), query, isList);
  },
  getPlans(networkId: number, networkGroupId: number): Promise<BaseInfoResponse<BaseInfoItem[]>> {
    const query = new URLSearchParams({ networkId: String(networkId), networkGroupId: String(networkGroupId) });
    return baseInfoGet(baseInfoEndpoints.plans(), query, isList);
  },
  getPlanDetail(planId: number): Promise<BaseInfoResponse<unknown>> {
    return baseInfoGet(baseInfoEndpoints.planDetail(planId), undefined, isDetail);
  },
  getPlanItems(planId: number): Promise<BaseInfoResponse<unknown>> {
    return baseInfoGet(baseInfoEndpoints.planItems(planId), undefined, isRecords);
  },
  getEstimateDetail(planId: number): Promise<BaseInfoResponse<unknown>> {
    return baseInfoGet(baseInfoEndpoints.estimateDetail(planId), undefined, isRecords);
  },
};

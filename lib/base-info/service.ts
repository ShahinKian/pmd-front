import { baseInfoGet } from "./client";
import { baseInfoEndpoints } from "./endpoints";
import type { BaseInfoItem, BaseInfoResponse } from "./types";

const isList = (value: unknown): value is BaseInfoItem[] => Array.isArray(value) && value.every((item) => item && typeof item === "object" && typeof item.Value === "string" && typeof item.Text === "string" && typeof item.Disabled === "boolean" && typeof item.Selected === "boolean");
const isDetail = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
const isRecords = (value: unknown): value is Record<string, unknown>[] => Array.isArray(value) && value.every((item) => item && typeof item === "object" && !Array.isArray(item));

// Lists share the server's Base Info credentials and contain no session-specific results.
const lookupLifetime = 30_000;
const maxCachedLookups = 128;
const lookups = new Map<string, { data: BaseInfoResponse<BaseInfoItem[]>; expiresAt: number }>();
const pendingLookups = new Map<string, Promise<BaseInfoResponse<BaseInfoItem[]>>>();

function listLookup(path: string, query?: URLSearchParams): Promise<BaseInfoResponse<BaseInfoItem[]>> {
  const key = path + "?" + (query?.toString() ?? "");
  const cached = lookups.get(key);
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.data);
  if (cached) lookups.delete(key);
  const pending = pendingLookups.get(key);
  if (pending) return pending;

  const request = baseInfoGet(path, query, isList).then((data) => {
    if (lookups.size >= maxCachedLookups) {
      const oldest = lookups.keys().next();
      if (!oldest.done) lookups.delete(oldest.value);
    }
    lookups.set(key, { data, expiresAt: Date.now() + lookupLifetime });
    return data;
  }).finally(() => pendingLookups.delete(key));
  pendingLookups.set(key, request);
  return request;
}

export const baseInfoService = {
  getNetworks(): Promise<BaseInfoResponse<BaseInfoItem[]>> {
    return listLookup(baseInfoEndpoints.networks());
  },
  getNetworkGroups(networkId: number): Promise<BaseInfoResponse<BaseInfoItem[]>> {
    return listLookup(baseInfoEndpoints.networkGroups(networkId));
  },
  getStructurePrograms(): Promise<BaseInfoResponse<BaseInfoItem[]>> {
    return listLookup(baseInfoEndpoints.structurePrograms());
  },
  getProgramDegrees(structureId: number): Promise<BaseInfoResponse<BaseInfoItem[]>> {
    return listLookup(baseInfoEndpoints.programDegree(structureId));
  },
  getBusinessTypes(): Promise<BaseInfoResponse<BaseInfoItem[]>> {
    return listLookup(baseInfoEndpoints.businessTypes());
  },
  getActivityTypes(jobId: number): Promise<BaseInfoResponse<BaseInfoItem[]>> {
    return listLookup(baseInfoEndpoints.activityTypes(jobId));
  },
  getProgramMakers(jobId: number, networkId: number, { fresh = false } = {}): Promise<BaseInfoResponse<BaseInfoItem[]>> {
    const query = new URLSearchParams({ jobId: String(jobId), networkId: String(networkId) });
    const path = baseInfoEndpoints.personnelProgramMaker();
    return fresh ? baseInfoGet(path, query, isList) : listLookup(path, query);
  },
  getPlans(networkId: number, networkGroupId: number): Promise<BaseInfoResponse<BaseInfoItem[]>> {
    const query = new URLSearchParams({ networkId: String(networkId), networkGroupId: String(networkGroupId) });
    return listLookup(baseInfoEndpoints.plans(), query);
  },
  getPlanDetail(planId: number): Promise<BaseInfoResponse<unknown>> {
    return baseInfoGet(baseInfoEndpoints.planDetail(planId), undefined, isDetail);
  },
  getPlanItems(planId: number): Promise<BaseInfoResponse<unknown>> {
    return baseInfoGet(baseInfoEndpoints.planItems(planId), undefined, isRecords);
  },
  getEstimate(planId: number): Promise<BaseInfoResponse<unknown>> {
    return baseInfoGet(baseInfoEndpoints.estimate(planId));
  },
  getEstimateDetail(planId: number): Promise<BaseInfoResponse<unknown>> {
    return baseInfoGet(baseInfoEndpoints.estimateDetail(planId), undefined, isRecords);
  },
};

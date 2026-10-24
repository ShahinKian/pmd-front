function positiveId(value: number, name: string): number {
  if (!Number.isInteger(value) || value <= 0) throw new TypeError(`${name} must be a positive integer`);
  return value;
}

export const baseInfoEndpoints = {
  networks: () => "networks",
  networkGroups: (networkId: number) => `networkgroups/${positiveId(networkId, "networkId")}`,
  structurePrograms: () => "structurePrograms",
  programDegree: (structureId: number) => `programDgree/${positiveId(structureId, "structureId")}`,
  businessTypes: () => "bussinessTypes",
  activityTypes: (jobId: number) => `activityTypes/${positiveId(jobId, "jobId")}`,
  personnelProgramMaker: () => "personelProgramMaker",
  plans: () => "plans",
  planDetail: (planId: number) => `planDetail/${positiveId(planId, "planId")}`,
  planItems: (planId: number) => `planItems/${positiveId(planId, "planId")}`,
  estimateDetail: (planId: number) => `estimateDetail/${positiveId(planId, "planId")}`,
} as const;

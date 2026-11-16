import type { RoleResponse } from "./types";

export const SYSTEM_ROLES = {
  Admin: "Admin",
  NetworkManager: "NetworkManager",
  NetworkGroupManager: "NetworkGroupManager",
  Providers: "Providers",
  PlanManager: "PlanManager",
  BroadcastManager: "BroadcastManager",
  LiveSupervisor: "LiveSupervisor",
  Supervisor: "Supervisor",
  PlanningInformation: "PlanningInformation",
  Finance: "Finance",
} as const;

export function isSystemAdmin(roles: readonly string[] | null | undefined): boolean {
  return Boolean(roles?.includes(SYSTEM_ROLES.Admin));
}

export function roleLabel(role: Pick<RoleResponse, "name" | "displayName">): string {
  return role.displayName?.trim() || role.name;
}

export function roleLabelForName(name: string, catalog: readonly RoleResponse[] | undefined): string {
  const role = catalog?.find((item) => item.name.toUpperCase() === name.toUpperCase());
  return role ? roleLabel(role) : name;
}

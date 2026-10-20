export const SYSTEM_ROLES = {
  Admin: "Admin",
  NetworkManager: "NetworkManager",
  NetworkGroupManager: "NetworkGroupManager",
  Providers: "Providers",
  PlanManager: "PlanManager",
  BroadcastManager: "BroadcastManager",
  LiveSupervisor: "LiveSupervisor",
  Supervisor: "Supervisor",
} as const;

export const ROLE_LABELS: Record<string, string> = {
  Admin: "مدیر سیستم",
  NetworkManager: "مدیر شبکه",
  NetworkGroupManager: "مدیر گروه برنامه‌ساز",
  Providers: "تهیه‌کننده",
  PlanManager: "مدیر طرح و برنامه‌ریزی",
  BroadcastManager: "مدیر پخش",
  LiveSupervisor: "ناظر برنامه زنده",
  Supervisor: "ناظر برنامه ضبطی",
};

export function isSystemAdmin(roles: readonly string[] | null | undefined): boolean {
  return Boolean(roles?.includes(SYSTEM_ROLES.Admin));
}

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

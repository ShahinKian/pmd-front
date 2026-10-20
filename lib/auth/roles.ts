export const SYSTEM_ROLES = {
  Admin: "Admin",
  PlanManager: "PlanManager",
  Providers: "Providers",
  NetworkGroupManager: "NetworkGroupManager",
} as const;

export const ROLE_LABELS: Record<string, string> = {
  Admin: "مدیر سیستم",
  PlanManager: "مدیر طرح و برنامه‌ریزی",
  Providers: "تهیه‌کننده",
  NetworkGroupManager: "مدیر گروه برنامه‌ساز",
};

export function isSystemAdmin(roles: readonly string[] | null | undefined): boolean {
  return Boolean(roles?.includes(SYSTEM_ROLES.Admin));
}

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

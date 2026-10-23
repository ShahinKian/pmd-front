export const roleLabels: Record<string, string> = {
  Admin: "مدیر سیستم",
  NetworkManager: "مدیر شبکه",
  NetworkGroupManager: "مدیر گروه",
  Providers: "تهیه‌کننده",
  PlanManager: "مدیر طرح و برنامه",
  BroadcastManager: "مدیر پخش",
  LiveSupervisor: "ناظر برنامه زنده",
  Supervisor: "ناظر برنامه ضبطی",
};

export function roleLabel(role?: string | null): string {
  if (!role) return "بدون نقش مشخص";
  return roleLabels[role] ?? role;
}

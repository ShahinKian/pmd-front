import type { SessionPayload } from "@/hooks/use-session";
import { SYSTEM_ROLES } from "@/lib/auth/roles";

export function certificateAccess(session?: SessionPayload | null) {
  const roles = session?.user.roles ?? [];
  const isAdmin = Boolean(session?.isSystemAdmin);
  const canIssue = roles.includes(SYSTEM_ROLES.PlanningInformation);
  const canApprove = roles.includes(SYSTEM_ROLES.PlanManager);
  const finance = roles.includes(SYSTEM_ROLES.Finance);

  return {
    canRead: isAdmin || canIssue || canApprove || finance,
    canCreatePeriod: isAdmin,
    canIssue,
    canApprove,
    canDeduct: canIssue || canApprove,
    canManageDutyCrew: isAdmin || canApprove,
    financeOnly: finance && !isAdmin && !canIssue && !canApprove,
  };
}

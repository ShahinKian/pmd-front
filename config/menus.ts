import {
  DashBoard,
  Files,
  ClipBoard,
  Graph,
  Settings,
  Users,
  Building,
  Building2,
} from "@/components/svg";
import { certificateAccess } from "@/lib/certificate/access";
import type { SessionPayload } from "@/hooks/use-session";

export interface PmdMenuItem {
  title: string;
  href?: string;
  icon: any;
  child?: PmdMenuItem[];
  nested?: PmdMenuItem[];
  badge?: string;
}

export function getPmdMenus(session?: SessionPayload | null): PmdMenuItem[] {
  const roles = session?.user.roles ?? [];
  const isProvider = roles.includes("Providers");
  const canManagePrograms = Boolean(
    session?.isSystemAdmin || roles.includes("PlanManager"),
  );
  const canManageKeywords = Boolean(
    session?.isSystemAdmin
      || roles.includes("PlanManager")
      || roles.includes("NetworkManager"),
  );

  const certificate = certificateAccess(session);

  return [
    {
      title: "صفحه اصلی",
      icon: DashBoard,
      child: [{ title: "داشبورد", href: "/dashboard", icon: Graph }],
    },
    {
      title: "ثبت عملکرد",
      icon: Files,
      child: [
        { title: "پیش‌بینی برنامه", href: "/forecasts", icon: ClipBoard },
        { title: "شناسنامه برنامه", href: "/program-profiles", icon: Files },
      ],
    },
    ...(certificate.canRead ? [{
      title: certificate.financeOnly ? "کارتابل مالی" : "مجوزهای قطعی",
      icon: Files,
      child: [
        { title: "مجوز قطعی برنامه‌های تولیدی", href: "/production-permits", icon: ClipBoard },
        ...(certificate.canIssue
          ? [{ title: "تعریف دوره پرداخت", href: "/production-permits/periods/new", icon: ClipBoard }]
          : []),
      ],
    }] : []),
    {
      title: "گزارشات",
      icon: Graph,
      child: [
        { title: "پیش‌بینی‌های تاییدشده", href: "/reports/approved-forecasts", icon: ClipBoard },
        { title: "گزارش شناسنامه‌ها", href: "/reports/program-profiles", icon: Files },
      ],
    },
    {
      title: "اطلاعات پایه",
      icon: Building2,
      child: [
        { title: "کارشناسان", href: "/experts", icon: Users },
        ...(certificate.canManageDutyCrew
          ? [{ title: "عوامل موظفی", href: "/duty-crew", icon: Users }]
          : []),
        ...(canManagePrograms
          ? [{ title: "برنامه‌های شبکه", href: "/plan-providers", icon: Building }]
          : []),
        ...(isProvider
          ? [{ title: "برنامه‌های من", href: "/my-plans", icon: Files }]
          : []),
        ...(canManageKeywords
          ? [{ title: "کلیدواژه‌ها", href: "/keywords", icon: ClipBoard }]
          : []),
      ],
    },
    ...(session?.isSystemAdmin
      ? [{
          title: "فرآیندها",
          icon: Graph,
          child: [
            { title: "تعریف فرآیند", href: "/workflows", icon: Graph },
            { title: "تخصیص فرآیند", href: "/workflows/assignments", icon: Settings },
          ],
        }]
      : []),
    ...(session?.isSystemAdmin
      ? [{
          title: "مدیریت سیستم",
          icon: Settings,
          child: [
            { title: "کاربران", href: "/users", icon: Users },
            { title: "تعریف کاربر", href: "/users/new", icon: Users },
          ],
        }]
      : []),
  ];
}

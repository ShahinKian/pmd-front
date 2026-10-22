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
  const canManagePlanProviders = Boolean(
    session?.isSystemAdmin || session?.user.roles.includes("PlanManager"),
  );

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
        { title: "شناسنامه عملکرد", href: "/program-profiles", icon: Files },
        { title: "کارشناسان", href: "/experts", icon: Users },
      ],
    },
    ...(session?.user.roles.includes("Providers") || canManagePlanProviders
      ? [{
          title: "طرح و تهیه‌کننده",
          icon: Building2,
          child: [
            ...(session?.user.roles.includes("Providers")
              ? [{ title: "طرح‌های من", href: "/my-plans", icon: Files }]
              : []),
            ...(canManagePlanProviders
              ? [{ title: "تخصیص طرح به تهیه‌کننده", href: "/plan-providers", icon: Building }]
              : []),
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
            { title: "ویرایش دسترسی", href: "/users/manage", icon: Settings },
            { title: "مدیریت Workflow", href: "/workflows", icon: Graph },
            { title: "تخصیص Workflow", href: "/workflows/assignments", icon: Settings },
          ],
        }]
      : []),
  ];
}

import {
  BarChart3,
  ClipboardList,
  FileText,
  FolderKanban,
  Link2,
  Users,
  UserPlus,
  UserCog,
} from "lucide-react";
import type { SessionPayload } from "@/hooks/use-session";

export interface PmdMenuItem {
  title: string;
  icon: any;
  href?: string;
  child?: PmdMenuItem[];
}

export function getPmdMenus(session?: SessionPayload | null): PmdMenuItem[] {
  const canManagePlanProviders = Boolean(
    session?.isSystemAdmin || session?.user.roles.includes("PlanManager"),
  );

  return [
    {
      title: "اصلی",
      icon: BarChart3,
      child: [{ title: "داشبورد", href: "/dashboard", icon: BarChart3 }],
    },
    {
      title: "ثبت عملکرد",
      icon: ClipboardList,
      child: [
        { title: "پیش‌بینی برنامه", href: "/forecasts", icon: ClipboardList },
        { title: "شناسنامه عملکرد", href: "/program-profiles", icon: FileText },
      ],
    },
    ...(session?.user.roles.includes("Providers") || canManagePlanProviders
      ? [{
          title: "طرح و تهیه‌کننده",
          icon: Link2,
          child: [
            ...(session?.user.roles.includes("Providers")
              ? [{ title: "طرح‌های من", href: "/my-plans", icon: FolderKanban }]
              : []),
            ...(canManagePlanProviders
              ? [{ title: "تخصیص طرح به تهیه‌کننده", href: "/plan-providers", icon: Link2 }]
              : []),
          ],
        }]
      : []),
    ...(session?.isSystemAdmin
      ? [{
          title: "مدیریت کاربران",
          icon: Users,
          child: [
            { title: "کاربران", href: "/users", icon: Users },
            { title: "تعریف کاربر", href: "/users/new", icon: UserPlus },
            { title: "ویرایش دسترسی", href: "/users/manage", icon: UserCog },
          ],
        }]
      : []),
  ];
}

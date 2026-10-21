"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  ChevronLeft,
  ClipboardList,
  FileText,
  FolderKanban,
  Link2,
  LogOut,
  Menu,
  RadioTower,
  ShieldCheck,
  UserCog,
  UserPlus,
  Users,
} from "lucide-react";
import { apiClient } from "@/lib/http/client";
import { useSession } from "@/hooks/use-session";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MenuItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

function initials(value?: string | null) {
  const words = (value ?? "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "ک";
  return words.slice(0, 2).map((word) => word[0]).join("");
}

export default function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const canManagePlanProviders = Boolean(
    session?.isSystemAdmin || session?.user.roles.includes("PlanManager"),
  );

  const groups: MenuGroup[] = [
    {
      label: "اصلی",
      items: [
        { href: "/dashboard", label: "داشبورد", icon: BarChart3 },
      ],
    },
    {
      label: "ثبت عملکرد",
      items: [
        { href: "/forecasts", label: "پیش‌بینی برنامه", icon: ClipboardList },
        { href: "/program-profiles", label: "شناسنامه عملکرد", icon: FileText },
      ],
    },
    {
      label: "طرح و تهیه‌کننده",
      items: [
        ...(session?.user.roles.includes("Providers")
          ? [{ href: "/my-plans", label: "طرح‌های من", icon: FolderKanban }]
          : []),
        ...(canManagePlanProviders
          ? [{ href: "/plan-providers", label: "تخصیص طرح به تهیه‌کننده", icon: Link2 }]
          : []),
      ],
    },
    {
      label: "مدیریت کاربران",
      items: session?.isSystemAdmin
        ? [
            { href: "/users", label: "کاربران", icon: Users },
            { href: "/users/new", label: "تعریف کاربر", icon: UserPlus },
            { href: "/users/manage", label: "ویرایش دسترسی", icon: UserCog },
          ]
        : [],
    },
  ].filter((group) => group.items.length > 0);

  async function logout() {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="brand">
          <div className="brand-mark">
            <RadioTower size={20} />
          </div>
          <div>
            <div className="brand-title">سامانه ثبت عملکرد</div>
            <div className="brand-subtitle">PMD Management System</div>
          </div>
        </div>

        <div className="sidebar-scroll">
          {groups.map((group) => (
            <section className="sidebar-group" key={group.label}>
              <div className="sidebar-label">{group.label}</div>
              <nav>
                {group.items.map(({ href, label, icon: Icon }) => {
                  const active =
                    pathname === href ||
                    (href !== "/dashboard" && pathname.startsWith(href + "/"));

                  return (
                    <Link
                      key={href}
                      href={href}
                      className={"nav-link " + (active ? "active" : "")}
                    >
                      <Icon size={18} />
                      <span>{label}</span>
                    </Link>
                  );
                })}
              </nav>
            </section>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <Avatar className="user-avatar">
              {session?.user.profilePictureUrl ? (
                <AvatarImage
                  src="/api/auth/profile/picture/view"
                  alt={session.user.fullName || session.user.userName}
                />
              ) : null}
              <AvatarFallback className="user-avatar-fallback">
                {initials(session?.user.fullName || session?.user.userName)}
              </AvatarFallback>
            </Avatar>
            <div style={{ minWidth: 0 }}>
              <div className="sidebar-user-name">
                {session?.user.fullName ||
                  session?.user.userName ||
                  "کاربر سامانه"}
              </div>
              <div className="sidebar-user-role">
                {session?.roleLabels?.join("، ") ||
                  "در حال دریافت سطح دسترسی"}
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="app-content">
        <header className="app-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button className="icon-button mobile-menu" aria-label="منو">
              <Menu size={18} />
            </button>
            <div>
              <div className="header-title">سامانه ثبت عملکرد</div>
              <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>
                مدیریت یکپارچه فرآیند ثبت و بررسی عملکرد
              </div>
            </div>
          </div>

          <div className="header-actions">
            {session?.isSystemAdmin ? (
              <span className="admin-badge">
                <ShieldCheck
                  size={13}
                  style={{ verticalAlign: "middle", marginLeft: 4 }}
                />
                مدیر سیستم
              </span>
            ) : null}

            <div className="header-profile">
              <Avatar className="user-avatar">
                {session?.user.profilePictureUrl ? (
                  <AvatarImage
                    src="/api/auth/profile/picture/view"
                    alt={session.user.fullName || session.user.userName}
                  />
                ) : null}
                <AvatarFallback className="user-avatar-fallback">
                  {initials(session?.user.fullName || session?.user.userName)}
                </AvatarFallback>
              </Avatar>
              <div className="header-profile-copy">
                <strong>
                  {session?.user.fullName ||
                    session?.user.userName ||
                    "کاربر سامانه"}
                </strong>
                <span>{session?.roleLabels?.[0] ?? ""}</span>
              </div>
            </div>

            <button
              type="button"
              className="icon-button"
              onClick={logout}
              title="خروج"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <div className="page-container">{children}</div>
      </div>
    </div>
  );
}

export function Breadcrumb({
  items,
}: {
  items: Array<{ label: string; href?: string }>;
}) {
  return (
    <div className="breadcrumb">
      {items.map((item, index) => (
        <span
          key={item.label}
          style={{ display: "flex", alignItems: "center", gap: 7 }}
        >
          {index > 0 ? <ChevronLeft size={12} /> : null}
          {item.href ? (
            <Link href={item.href}>{item.label}</Link>
          ) : (
            <span>{item.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}

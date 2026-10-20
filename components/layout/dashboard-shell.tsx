"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  ChevronLeft,
  ClipboardList,
  LogOut,
  Menu,
  RadioTower,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { apiClient } from "@/lib/http/client";
import { useSession } from "@/hooks/use-session";

const baseItems = [
  { href: "/dashboard", label: "داشبورد", icon: BarChart3 },
  { href: "/forecasts", label: "پیش‌بینی برنامه", icon: ClipboardList },
];

const adminItems = [
  { href: "/users", label: "مدیریت کاربران", icon: Users },
  { href: "/users/new", label: "تعریف کاربر", icon: UserPlus },
];

export default function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const items = session?.isSystemAdmin ? [...baseItems, ...adminItems] : baseItems;

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
          <div className="brand-mark"><RadioTower size={22} /></div>
          <div>
            <div className="brand-title">سامانه ثبت عملکرد</div>
            <div className="brand-subtitle">PMD Management System</div>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">منوی اصلی</div>
          <nav>
            {items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
              return (
                <Link key={href} href={href} className={`nav-link ${active ? "active" : ""}`}>
                  <Icon size={18} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-name">
              {session?.user.fullName || session?.user.userName || "کاربر سامانه"}
            </div>
            <div className="sidebar-user-role">
              {session?.roleLabels?.join("، ") || "در حال دریافت سطح دسترسی"}
            </div>
          </div>
        </div>
      </aside>

      <div className="app-content">
        <header className="app-header">
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button className="icon-button mobile-menu" aria-label="منو"><Menu size={18}/></button>
            <div>
              <div className="header-title">سامانه ثبت عملکرد</div>
              <div className="muted" style={{fontSize:11,marginTop:3}}>مدیریت یکپارچه فرآیند ثبت و بررسی عملکرد</div>
            </div>
          </div>
          <div className="header-actions">
            {session?.isSystemAdmin ? (
              <span className="admin-badge"><ShieldCheck size={13} style={{verticalAlign:"middle",marginLeft:4}}/>مدیر سیستم</span>
            ) : null}
            <button type="button" className="icon-button" onClick={logout} title="خروج">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <div className="page-container">{children}</div>
      </div>
    </div>
  );
}

export function Breadcrumb({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <div className="breadcrumb">
      {items.map((item, index) => (
        <span key={item.label} style={{display:"flex",alignItems:"center",gap:7}}>
          {index > 0 ? <ChevronLeft size={12}/> : null}
          {item.href ? <Link href={item.href}>{item.label}</Link> : <span>{item.label}</span>}
        </span>
      ))}
    </div>
  );
}

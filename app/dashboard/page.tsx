"use client";

import useSWR from "swr";
import {
  BadgeCheck,
  ChartNoAxesColumnIncreasing,
  ClipboardCheck,
  FileCheck2,
  Files,
  Hourglass,
  Network,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import DashboardShell, { Breadcrumb } from "@/components/layout/dashboard-shell";
import { useSession } from "@/hooks/use-session";

interface DashboardSummary {
  totalForecasts: number;
  approvedForecasts: number;
  pendingForecasts: number;
  totalProfiles: number;
  approvedProfiles: number;
  pendingProfiles: number;
}

export default function DashboardPage() {
  const { data: session, error, isLoading } = useSession();
  const {
    data: summary,
    error: summaryError,
    isLoading: summaryLoading,
  } = useSWR<DashboardSummary>(session ? "/reports/dashboard-summary" : null);

  const cards = summary ? [
    {
      label: "کل پیش‌بینی‌ها",
      value: summary.totalForecasts,
      detail: `${summary.pendingForecasts} مورد در جریان بررسی`,
      icon: ChartNoAxesColumnIncreasing,
      className: "from-sky-50 to-blue-50 border-sky-100 text-sky-800",
      iconClass: "bg-sky-100 text-sky-700",
    },
    {
      label: "پیش‌بینی‌های تاییدشده",
      value: summary.approvedForecasts,
      detail: "تایید نهایی فرآیند پیش‌بینی",
      icon: BadgeCheck,
      className: "from-emerald-50 to-green-50 border-emerald-100 text-emerald-800",
      iconClass: "bg-emerald-100 text-emerald-700",
    },
    {
      label: "کل شناسنامه‌ها",
      value: summary.totalProfiles,
      detail: `${summary.pendingProfiles} مورد در گردش تایید`,
      icon: Files,
      className: "from-violet-50 to-purple-50 border-violet-100 text-violet-800",
      iconClass: "bg-violet-100 text-violet-700",
    },
    {
      label: "شناسنامه‌های تایید نهایی",
      value: summary.approvedProfiles,
      detail: "شناسنامه‌های تکمیل‌شده",
      icon: FileCheck2,
      className: "from-amber-50 to-orange-50 border-amber-100 text-amber-800",
      iconClass: "bg-amber-100 text-amber-700",
    },
  ] : [];

  return (
    <DashboardShell>
      <Breadcrumb items={[{ label: "داشبورد" }]} />
      <div className="page-head">
        <div>
          <h1 className="page-title">داشبورد</h1>
          <p className="page-description">
            نمای کلی سامانه ثبت عملکرد متناسب با سطح دسترسی شما
          </p>
        </div>
      </div>

      {error ? <div className="alert alert-error">دریافت اطلاعات کاربر انجام نشد.</div> : null}
      {isLoading ? <div className="card">در حال بارگذاری اطلاعات...</div> : null}

      {session ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="card stat-card shadow-sm">
              <div className="stat-icon"><UserRound size={22}/></div>
              <div>
                <div className="stat-label">کاربر جاری</div>
                <div className="stat-value">{session.user.fullName || session.user.userName}</div>
              </div>
            </div>
            <div className="card stat-card shadow-sm">
              <div className="stat-icon"><ShieldCheck size={22}/></div>
              <div>
                <div className="stat-label">سطح دسترسی</div>
                <div className="stat-value" style={{fontSize:15}}>
                  {session.roleLabels.join("، ") || "کاربر"}
                </div>
              </div>
            </div>
            <div className="card stat-card shadow-sm">
              <div className="stat-icon"><Network size={22}/></div>
              <div>
                <div className="stat-label">شبکه‌های تخصیص‌یافته</div>
                <div className="stat-value">{session.user.networkIds.length}</div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2">
            <ClipboardCheck size={20}/>
            <h2 className="text-lg font-semibold">نمای کلی عملکرد</h2>
          </div>

          {summaryLoading ? (
            <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[0,1,2,3].map(x=><div key={x} className="h-36 animate-pulse rounded-2xl border bg-default-50 shadow-sm"/>)}
            </div>
          ) : null}

          {summaryError ? (
            <div className="alert alert-error mt-3">دریافت آمار داشبورد انجام نشد.</div>
          ) : null}

          {summary ? (
            <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {cards.map(card => {
                const Icon=card.icon;
                return (
                  <article
                    key={card.label}
                    className={`rounded-2xl border bg-gradient-to-br p-5 shadow-lg shadow-black/5 ${card.className}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-medium opacity-80">{card.label}</div>
                        <div className="mt-3 text-4xl font-black tabular-nums">{card.value.toLocaleString("fa-IR")}</div>
                      </div>
                      <div className={`rounded-xl p-3 shadow-sm ${card.iconClass}`}><Icon size={24}/></div>
                    </div>
                    <div className="mt-5 flex items-center gap-2 text-xs opacity-75">
                      <Hourglass size={14}/>{card.detail}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}

          {session.isSystemAdmin ? (
            <section className="card mt-5 shadow-sm">
              <div className="flex items-center gap-3">
                <ShieldCheck size={20}/>
                <div>
                  <strong>مدیریت سامانه</strong>
                  <p className="muted mt-1 mb-0">
                    آمار بالا بر اساس سطح دسترسی و داده واقعی پیش‌بینی‌ها و شناسنامه‌ها محاسبه شده است.
                  </p>
                </div>
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </DashboardShell>
  );
}

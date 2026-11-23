"use client";

import Link from "next/link";
import useSWR from "swr";
import {
  ArrowLeft, BadgeCheck, ChartNoAxesColumnIncreasing, CircleDot, ClipboardCheck,
  FileCheck2, Files, Hourglass, Network, Plus, ShieldCheck, UserRound,
} from "lucide-react";
import DashboardShell, { Breadcrumb } from "@/components/layout/dashboard-shell";
import { useSession } from "@/hooks/use-session";
import type { EnrichedProviderPlan } from "@/lib/plan-providers/types";

interface DashboardSummary {
  totalForecasts: number;
  approvedForecasts: number;
  pendingForecasts: number;
  totalProfiles: number;
  approvedProfiles: number;
  pendingProfiles: number;
}

const persian = (value: number) => value.toLocaleString("fa-IR");

export default function DashboardPage() {
  const { data: session, error, isLoading } = useSession();
  const { data: summary, error: summaryError, isLoading: summaryLoading } =
    useSWR<DashboardSummary>(session ? "/reports/dashboard-summary" : null);
  const isProvider = session?.user.roles.includes("Providers") ?? false;
  const { data: providerPlans } = useSWR<EnrichedProviderPlan[]>(
    isProvider ? "/plan-providers/my/plans/enriched" : null
  );
  const networkCount = isProvider
    ? new Set((providerPlans ?? []).map(plan => plan.networkId).filter(id => typeof id === "number" && id > 0)).size
    : (session?.user.networkIds.length ?? 0);

  const metrics = summary ? [
    { title: "کل پیش‌بینی‌ها", value: summary.totalForecasts, detail: persian(summary.pendingForecasts) + " در انتظار بررسی", icon: ChartNoAxesColumnIncreasing, tone: "bg-[#eee9ff] text-[#5845ae] dark:bg-[#30264d] dark:text-[#d4c6ff]", href: "/forecasts" },
    { title: "پیش‌بینی‌های تأییدشده", value: summary.approvedForecasts, detail: "تأیید نهایی", icon: BadgeCheck, tone: "bg-[#e2f5ee] text-[#187258] dark:bg-[#224238] dark:text-[#9ce7cb]", href: "/reports/approved-forecasts" },
    { title: "کل شناسنامه‌ها", value: summary.totalProfiles, detail: persian(summary.pendingProfiles) + " در گردش تأیید", icon: Files, tone: "bg-[#fceee7] text-[#a54c30] dark:bg-[#4c302b] dark:text-[#ffbca5]", href: "/program-profiles" },
    { title: "شناسنامه‌های نهایی", value: summary.approvedProfiles, detail: "تکمیل‌شده", icon: FileCheck2, tone: "bg-[#e7effe] text-[#385a9e] dark:bg-[#283653] dark:text-[#adcbff]", href: "/reports/approved-profiles" },
  ] : [];

  return (
    <DashboardShell>
      <div className="grid gap-5">
        <Breadcrumb items={[{ label: "داشبورد" }]} />
        <div className="page-head">
          <div>
            <h1 className="page-title">نمای کلی عملکرد</h1>
            <p className="page-description">وضعیت برنامه‌ها و گردش‌کارها، متناسب با دسترسی شما</p>
          </div>
          {isProvider ? (
            <Link href="/forecasts/new" className="btn btn-primary"><Plus size={16}/>ثبت پیش‌بینی جدید</Link>
          ) : null}
        </div>

        {error ? <div role="alert" className="alert alert-error">دریافت اطلاعات کاربر انجام نشد.</div> : null}
        {isLoading ? <div className="panel animate-pulse p-6">در حال بارگذاری اطلاعات...</div> : null}

        {session ? (
          <>
            <section className="hero-reference relative isolate overflow-hidden rounded-2xl bg-linear-to-l from-[#2f2557] via-[#3b2b72] to-[#493784] px-5 py-6 text-white sm:px-7 sm:py-8">
              <div className="hero-orbits pointer-events-none absolute inset-y-[-80%] end-0 -z-10 hidden w-[48%] -rotate-18 opacity-85 sm:block" aria-hidden="true"/>
              <div className="relative grid max-w-2xl gap-2">
                <span className="flex items-center gap-2 text-xs font-medium text-[#d9cfff]">
                  <CircleDot className="size-3.5 text-[#ffb59e]"/>سامانه ثبت عملکرد
                </span>
                <h2 className="text-xl font-extrabold sm:text-2xl">خوش آمدید، {session.user.fullName || session.user.userName}</h2>
                <p className="text-sm leading-7 text-[#ded6f7]">پیش‌بینی برنامه، شناسنامه عملکرد و وضعیت تأییدها را در یک فضای کاری مدیریت کنید.</p>
                <Link href="/forecasts" className="mt-2 inline-flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#332762] transition-colors hover:bg-[#e9e0ff]">
                  مشاهده پیش‌بینی‌ها <ArrowLeft size={16}/>
                </Link>
              </div>
            </section>

            {summaryLoading ? (
              <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="بارگذاری شاخص‌ها">
                {[0,1,2,3].map(i => <div key={i} className="panel h-32 animate-pulse bg-muted"/>)}
              </section>
            ) : null}
            {summaryError ? <div role="alert" className="alert alert-error">دریافت آمار داشبورد انجام نشد.</div> : null}
            {summary ? (
              <section aria-label="شاخص‌های عملکرد" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {metrics.map(metric => {
                  const Icon = metric.icon;
                  return (
                    <Link href={metric.href} key={metric.title} className="panel grid min-w-0 gap-2 p-3.5 transition-shadow hover:shadow-md sm:p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className={`grid size-9 place-items-center rounded-xl ${metric.tone}`}><Icon className="size-[18px]"/></span>
                        <span className="text-[.64rem] font-semibold text-muted-foreground">{metric.detail}</span>
                      </div>
                      <strong className="text-2xl leading-tight font-black tabular-nums">{persian(metric.value)}</strong>
                      <span className="text-xs font-medium text-muted-foreground">{metric.title}</span>
                    </Link>
                  );
                })}
              </section>
            ) : null}

            <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
              <section className="panel min-w-0">
                <div className="border-b border-border px-5 py-4"><h2 className="text-base font-extrabold">دسترسی‌های سریع</h2></div>
                <div className="grid gap-2 p-4 sm:grid-cols-2">
                  {[
                    { href: "/forecasts", title: "پیش‌بینی برنامه", icon: ClipboardCheck },
                    { href: "/program-profiles", title: "شناسنامه برنامه", icon: Files },
                    { href: "/reports/approved-forecasts", title: "گزارش پیش‌بینی‌های تأییدشده", icon: BadgeCheck },
                    { href: "/reports/program-profiles", title: "گزارش شناسنامه‌ها", icon: FileCheck2 },
                  ].map(link => {
                    const Icon=link.icon;
                    return <Link key={link.href} href={link.href} className="flex items-center gap-3 rounded-xl border border-border p-4 text-sm font-bold hover:border-primary/40 hover:bg-muted">
                      <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary"><Icon size={18}/></span>
                      <span className="flex-1">{link.title}</span><ArrowLeft size={15} className="text-muted-foreground"/>
                    </Link>;
                  })}
                </div>
              </section>
              <section className="panel min-w-0">
                <div className="border-b border-border px-5 py-4"><h2 className="text-base font-extrabold">حساب و دسترسی</h2></div>
                <div className="grid gap-4 px-5 py-5 text-sm">
                  <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><UserRound size={20}/></span><div><span className="block text-xs text-muted-foreground">کاربر جاری</span><strong>{session.user.fullName || session.user.userName}</strong></div></div>
                  <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><ShieldCheck size={20}/></span><div><span className="block text-xs text-muted-foreground">نقش‌ها</span><strong>{session.roleLabels.join("، ") || "کاربر"}</strong></div></div>
                  <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Network size={20}/></span><div><span className="block text-xs text-muted-foreground">{isProvider ? "شبکه‌های دارای برنامه" : "شبکه‌های تخصیص‌یافته"}</span><strong>{persian(networkCount)}</strong></div></div>
                  {summary ? <div className="flex items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground"><Hourglass size={14}/>داده‌ها از گزارش واقعی سامانه دریافت می‌شوند.</div> : null}
                </div>
              </section>
            </div>
          </>
        ) : null}
      </div>
    </DashboardShell>
  );
}

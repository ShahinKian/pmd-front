"use client";

import useSWR from "swr";
import { CalendarClock, FolderKanban } from "lucide-react";
import DashboardShell, { Breadcrumb } from "@/components/layout/dashboard-shell";
import { useSession } from "@/hooks/use-session";
import { displayDate } from "@/lib/certificate/format";
import type { ActiveProviderPlans } from "@/lib/plan-providers/types";

export default function MyPlansPage() {
  const { data: session } = useSession();
  const isProvider = session?.user.roles.includes("Providers") ?? false;
  const { data, error, isLoading, mutate } = useSWR<ActiveProviderPlans>(
    isProvider ? "/plan-providers/my/plans/enriched?activeOnly=true" : null,
  );

  return (
    <DashboardShell>
      <Breadcrumb items={[{ label: "داشبورد", href: "/dashboard" }, { label: "برنامه‌های من" }]} />
      <div className="page-head">
        <div>
          <h1 className="page-title">برنامه‌های من</h1>
          <p className="page-description">برنامه‌های تخصیص‌یافته‌ای که امروز در بازه زمانی آن‌هاست</p>
        </div>
      </div>

      {session && !isProvider ? (
        <div className="alert alert-error">این صفحه فقط برای کاربران دارای نقش تهیه‌کننده قابل استفاده است.</div>
      ) : null}

      {isLoading ? <div className="card">در حال دریافت برنامه‌ها...</div> : null}
      {error ? <div className="alert alert-error">دریافت برنامه‌های تهیه‌کننده انجام نشد.</div> : null}

      {data?.scheduleUnavailableCount ? (
        <div className="alert alert-error mb-4" role="alert">
          بازه زمانی برخی برنامه‌ها از سرویس اطلاعات پایه دریافت نشد.{" "}
          <button className="underline" type="button" onClick={()=>void mutate()}>تلاش مجدد</button>
        </div>
      ) : null}

      {data?.plans.length ? (
        <section className="card" style={{padding:0,overflow:"hidden"}}>
          <table className="w-full text-right text-sm">
            <thead className="bg-default-50"><tr><th className="p-3">نام برنامه</th><th className="p-3">بازه برنامه</th><th className="p-3">تاریخ تخصیص</th></tr></thead>
            <tbody className="divide-y divide-default-100">
              {data.plans.map((plan) => (
                <tr key={plan.planId}>
                  <td className="p-3"><div className="flex items-center gap-2"><FolderKanban size={18}/><strong>{plan.title}</strong></div></td>
                  <td className="p-3">{displayDate(plan.startDate)} تا {displayDate(plan.endDate)}</td>
                  <td className="p-3 muted"><span className="inline-flex items-center gap-2"><CalendarClock size={14}/>{new Date(plan.assignedAt).toLocaleString("fa-IR")}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {data?.plans.length === 0 ? (
        <div className="card" style={{textAlign:"center",padding:36}}>
          <FolderKanban size={30} style={{margin:"0 auto 10px"}}/>
          <strong>برنامه‌ای با بازه زمانی معتبر برای امروز یافت نشد.</strong>
        </div>
      ) : null}
    </DashboardShell>
  );
}

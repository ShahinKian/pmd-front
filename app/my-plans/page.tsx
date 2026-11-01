"use client";

import useSWR from "swr";
import { CalendarClock, FolderKanban } from "lucide-react";
import DashboardShell, { Breadcrumb } from "@/components/layout/dashboard-shell";
import { useSession } from "@/hooks/use-session";
import type { EnrichedProviderPlan } from "@/lib/plan-providers/types";

export default function MyPlansPage() {
  const { data: session } = useSession();
  const isProvider = session?.user.roles.includes("Providers") ?? false;
  const { data, error, isLoading } = useSWR<EnrichedProviderPlan[]>(
    isProvider ? "/plan-providers/my/plans/enriched" : null,
  );

  return (
    <DashboardShell>
      <Breadcrumb items={[{ label: "داشبورد", href: "/dashboard" }, { label: "برنامه‌های من" }]} />
      <div className="page-head">
        <div>
          <h1 className="page-title">برنامه‌های من</h1>
          <p className="page-description">تمام برنامه‌های تخصیص‌یافته به شما در شبکه‌های مجاز</p>
        </div>
      </div>

      {session && !isProvider ? (
        <div className="alert alert-error">این صفحه فقط برای کاربران دارای نقش تهیه‌کننده قابل استفاده است.</div>
      ) : null}

      {isLoading ? <div className="card">در حال دریافت برنامه‌ها...</div> : null}
      {error ? <div className="alert alert-error">دریافت برنامه‌های تهیه‌کننده انجام نشد.</div> : null}

      {data ? (
        <section className="card" style={{padding:0,overflow:"hidden"}}>
          <table className="w-full text-right text-sm">
            <thead className="bg-default-50"><tr><th className="p-3">نام برنامه</th><th className="p-3">تاریخ تخصیص</th></tr></thead>
            <tbody className="divide-y divide-default-100">
              {data.map((plan) => (
                <tr key={plan.planId}>
                  <td className="p-3"><div className="flex items-center gap-2"><FolderKanban size={18}/><strong>{plan.title}</strong></div></td>
                  <td className="p-3 muted"><span className="inline-flex items-center gap-2"><CalendarClock size={14}/>{new Date(plan.assignedAt).toLocaleString("fa-IR")}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {data?.length === 0 ? (
        <div className="card" style={{textAlign:"center",padding:36}}>
          <FolderKanban size={30} style={{margin:"0 auto 10px"}}/>
          <strong>برنامه‌ای به این تهیه‌کننده تخصیص داده نشده است.</strong>
        </div>
      ) : null}
    </DashboardShell>
  );
}

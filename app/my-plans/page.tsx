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
      <Breadcrumb items={[{ label: "داشبورد", href: "/dashboard" }, { label: "طرح‌های من" }]} />
      <div className="page-head">
        <div>
          <h1 className="page-title">طرح‌های من</h1>
          <p className="page-description">تمام طرح‌های متصل به شناسه تهیه‌کننده شما در همه شبکه‌های معاونت</p>
        </div>
      </div>

      {session && !isProvider ? (
        <div className="alert alert-error">این صفحه فقط برای کاربران دارای نقش تهیه‌کننده قابل استفاده است.</div>
      ) : null}

      {isLoading ? <div className="card">در حال دریافت طرح‌ها...</div> : null}
      {error ? <div className="alert alert-error">دریافت طرح‌های تهیه‌کننده انجام نشد.</div> : null}

      {data ? (
        <div className="grid grid-3">
          {data.map((plan) => (
            <article className="card" key={plan.planId}>
              <div className="stat-icon" style={{marginBottom:14}}><FolderKanban size={21}/></div>
              <h2 style={{fontSize:16,margin:"0 0 8px"}}>{plan.title}</h2>
              <div className="muted" style={{fontSize:12}}>PlanId: {plan.planId}</div>
              <div className="muted" style={{fontSize:12,marginTop:8,display:"flex",alignItems:"center",gap:6}}>
                <CalendarClock size={14}/>
                تاریخ اتصال: {new Date(plan.assignedAt).toLocaleString("fa-IR")}
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {data?.length === 0 ? (
        <div className="card" style={{textAlign:"center",padding:36}}>
          <FolderKanban size={30} style={{margin:"0 auto 10px"}}/>
          <strong>طرحی به این تهیه‌کننده تخصیص داده نشده است.</strong>
        </div>
      ) : null}
    </DashboardShell>
  );
}

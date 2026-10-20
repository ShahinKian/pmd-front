"use client";

import { ClipboardCheck, Network, ShieldCheck, UserRound } from "lucide-react";
import DashboardShell, { Breadcrumb } from "@/components/layout/dashboard-shell";
import { useSession } from "@/hooks/use-session";

export default function DashboardPage() {
  const { data: session, error, isLoading } = useSession();

  return (
    <DashboardShell>
      <Breadcrumb items={[{ label: "داشبورد" }]} />
      <div className="page-head">
        <div>
          <h1 className="page-title">داشبورد</h1>
          <p className="page-description">نمای کلی سامانه ثبت عملکرد متناسب با سطح دسترسی شما</p>
        </div>
      </div>

      {error ? <div className="alert alert-error">دریافت اطلاعات کاربر انجام نشد.</div> : null}
      {isLoading ? <div className="card">در حال بارگذاری اطلاعات...</div> : null}

      {session ? (
        <>
          <div className="grid grid-3">
            <div className="card stat-card">
              <div className="stat-icon"><UserRound size={22}/></div>
              <div>
                <div className="stat-label">کاربر جاری</div>
                <div className="stat-value">{session.user.fullName || session.user.userName}</div>
              </div>
            </div>
            <div className="card stat-card">
              <div className="stat-icon"><ShieldCheck size={22}/></div>
              <div>
                <div className="stat-label">سطح دسترسی</div>
                <div className="stat-value" style={{fontSize:15}}>{session.roleLabels.join("، ") || "کاربر"}</div>
              </div>
            </div>
            <div className="card stat-card">
              <div className="stat-icon"><Network size={22}/></div>
              <div>
                <div className="stat-label">شبکه‌های تخصیص‌یافته</div>
                <div className="stat-value">{session.user.networkIds.length}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-2" style={{marginTop:18}}>
            <section className="card">
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <ClipboardCheck size={20}/>
                <strong>وضعیت سامانه</strong>
              </div>
              <p className="muted" style={{lineHeight:1.9,margin:0}}>
                آمار عملیاتی پس از اتصال endpointهای مربوط به هر ماژول نمایش داده می‌شود.
                هیچ عدد ساختگی یا عمومی در داشبورد نمایش داده نخواهد شد.
              </p>
            </section>

            {session.isSystemAdmin ? (
              <section className="card">
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                  <ShieldCheck size={20}/>
                  <strong>مدیر سیستم</strong>
                </div>
                <p className="muted" style={{lineHeight:1.9,margin:0}}>
                  شما مدیر کل سامانه ثبت عملکرد هستید. دسترسی‌های مدیریتی واقعی بر اساس Policyهای بک‌اند اعمال می‌شوند.
                </p>
              </section>
            ) : null}
          </div>
        </>
      ) : null}
    </DashboardShell>
  );
}

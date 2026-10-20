"use client";

import Link from "next/link";
import { Plus, ShieldCheck, Users } from "lucide-react";
import DashboardShell, { Breadcrumb } from "@/components/layout/dashboard-shell";
import { useSession } from "@/hooks/use-session";

export default function UsersPage() {
  const { data: session, isLoading } = useSession();

  return (
    <DashboardShell>
      <Breadcrumb items={[{ label: "داشبورد", href: "/dashboard" }, { label: "مدیریت کاربران" }]} />
      <div className="page-head">
        <div>
          <h1 className="page-title">مدیریت کاربران</h1>
          <p className="page-description">تعریف کاربران و مدیریت سطح دسترسی سامانه</p>
        </div>
        {session?.isSystemAdmin ? (
          <Link href="/users/new" className="btn btn-primary"><Plus size={17}/>تعریف کاربر جدید</Link>
        ) : null}
      </div>

      {isLoading ? <div className="card">در حال بررسی دسترسی...</div> : null}

      {session && !session.isSystemAdmin ? (
        <div className="alert alert-error">دسترسی به مدیریت کاربران فقط برای مدیر سیستم مجاز است.</div>
      ) : null}

      {session?.isSystemAdmin ? (
        <section className="card">
          <div style={{display:"flex",gap:13,alignItems:"flex-start"}}>
            <div className="stat-icon"><Users size={21}/></div>
            <div>
              <h2 style={{margin:"2px 0 8px",fontSize:17}}>فهرست کاربران</h2>
              <p className="muted" style={{margin:0,lineHeight:1.9}}>
                در قرارداد فعلی pmd-api endpoint فهرست همه کاربران وجود ندارد؛ بنابراین برای جلوگیری از نمایش داده ساختگی،
                جدول کاربران تا زمان اضافه‌شدن endpoint واقعی بک‌اند نمایش داده نمی‌شود.
              </p>
              <div className="alert" style={{marginTop:16,background:"#fffbeb",border:"1px solid #fde68a",color:"#92400e"}}>
                <ShieldCheck size={15} style={{verticalAlign:"middle",marginLeft:6}}/>
                تعریف کاربر جدید، دریافت نقش‌ها و تخصیص providerId از همین پنل به API واقعی متصل است.
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </DashboardShell>
  );
}

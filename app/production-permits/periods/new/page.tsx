"use client";

import { useState } from "react";
import Link from "next/link";
import DashboardShell, { Breadcrumb } from "@/components/layout/dashboard-shell";
import { PaymentPeriodForm, refreshPaymentPeriods } from "@/components/certificate/payment-period-form";
import { useSession } from "@/hooks/use-session";
import { certificateAccess } from "@/lib/certificate/access";
import { displayDate, displayNumber, paymentMonths } from "@/lib/certificate/format";
import type { PaymentPeriod } from "@/lib/certificate/types";
import { apiClient, apiErrorMessage } from "@/lib/http/client";

export default function NewPaymentPeriodPage() {
  const { data: session, error: sessionError, isLoading } = useSession();
  const { canCreatePeriod } = certificateAccess(session);
  const [saved, setSaved] = useState<PaymentPeriod | null>(null);

  return <DashboardShell>
    <Breadcrumb items={[
      { label: "داشبورد", href: "/dashboard" },
      { label: "دوره‌های پرداخت", href: "/production-permits/periods" },
      { label: "تعریف دوره پرداخت" },
    ]} />
    <div className="page-head"><h1 className="page-title">تعریف دوره پرداخت</h1></div>
    {isLoading && <p role="status">در حال بررسی دسترسی…</p>}
    {sessionError && <p role="alert" className="alert alert-error">{apiErrorMessage(sessionError, "دسترسی کاربر دریافت نشد.")}</p>}
    {session && !canCreatePeriod && <p className="alert alert-error" role="alert">تعریف دورهٔ پرداخت فقط در دسترسی «مدیر سیستم» است.</p>}
    {session && canCreatePeriod && (saved
      ? <section className="card grid gap-3">
        <p role="status" className="alert alert-success">دوره پرداخت برای همه شبکه‌ها ثبت شد.</p>
        <p>{paymentMonths[saved.paymentMonth - 1]} {displayNumber(saved.paymentYear)} · {displayDate(saved.fromDate)} تا {displayDate(saved.toDate)}</p>
        <div><Link href="/production-permits/periods" className="btn btn-primary">مشاهده دوره‌های پرداخت</Link></div>
      </section>
      : <PaymentPeriodForm saveLabel="ثبت دوره پرداخت" onSave={async (input) => {
        const { data } = await apiClient.post<PaymentPeriod>("/certificate/periods", input);
        setSaved(data);
        refreshPaymentPeriods();
      }}>
        <Link href="/production-permits/periods" className="btn btn-outline">بازگشت به دوره‌ها</Link>
      </PaymentPeriodForm>)}
  </DashboardShell>;
}

"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { mutate } from "swr";
import DashboardShell, { Breadcrumb } from "@/components/layout/dashboard-shell";
import { NetworkSelect } from "@/components/certificate/network-select";
import { PersianDatePicker } from "@/components/ui/persian-date-picker";
import { useSession } from "@/hooks/use-session";
import { certificateAccess } from "@/lib/certificate/access";
import { displayDate, displayNumber, paymentMonths } from "@/lib/certificate/format";
import type { PaymentPeriod } from "@/lib/certificate/types";
import { apiClient, apiErrorMessage } from "@/lib/http/client";

export default function NewPaymentPeriodPage() {
  const { data: session, error: sessionError, isLoading } = useSession();
  const { canIssue } = certificateAccess(session);
  const [network, setNetwork] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<PaymentPeriod | null>(null);
  const currentYear = new Intl.DateTimeFormat("en-u-ca-persian", { year: "numeric", timeZone: "Asia/Tehran" })
    .formatToParts(new Date()).find((part) => part.type === "year")?.value;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canIssue || !network || busy) return;
    setError("");
    if (!fromDate || !toDate || fromDate > toDate) {
      setError("تاریخ شروع و پایان دوره را بررسی کنید.");
      return;
    }

    const data = new FormData(event.currentTarget);
    const path = `/certificate/networks/${network}/periods`;
    setBusy(true);
    try {
      const response = await apiClient.post<PaymentPeriod>(path, {
        fromDate, toDate, paymentYear: Number(data.get("year")), paymentMonth: Number(data.get("month")),
      });
      setSaved(response.data);
      void mutate(path);
    } catch (cause) {
      setError(apiErrorMessage(cause, "ثبت دورهٔ پرداخت انجام نشد."));
    } finally {
      setBusy(false);
    }
  }

  return <DashboardShell>
    <Breadcrumb items={[
      { label: "داشبورد", href: "/dashboard" },
      { label: "مجوز قطعی برنامه‌های تولیدی", href: "/production-permits" },
      { label: "تعریف دوره پرداخت" },
    ]} />
    <div className="page-head"><h1 className="page-title">تعریف دوره پرداخت</h1></div>
    {isLoading && <p role="status">در حال بررسی دسترسی…</p>}
    {sessionError && <p role="alert" className="alert alert-error">{apiErrorMessage(sessionError, "دسترسی کاربر دریافت نشد.")}</p>}
    {session && !canIssue && <p className="alert alert-error" role="alert">تعریف دورهٔ پرداخت در دسترسی نقش «اطلاعات برنامه‌ریزی» است.</p>}
    {session && canIssue && (saved
      ? <section className="card grid gap-3">
        <p role="status" className="alert alert-success">دوره پرداخت ثبت شد.</p>
        <p>{paymentMonths[saved.paymentMonth - 1]} {displayNumber(saved.paymentYear)} · {displayDate(saved.fromDate)} تا {displayDate(saved.toDate)}</p>
        <div><Link href="/production-permits" className="btn btn-primary">مشاهده دوره‌ها و مجوزها</Link></div>
      </section>
      : <form className="card grid gap-4" onSubmit={submit}>
        <div className="form-grid">
          <NetworkSelect session={session} value={network} disabled={busy} onChange={setNetwork} />
          <label className="field"><span className="label">ماه پرداخت</span>
            <select className="select" name="month" required disabled={busy}>
              <option value="">انتخاب ماه</option>
              {paymentMonths.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
            </select>
          </label>
          <div className="field"><span className="label">از تاریخ</span>
            <PersianDatePicker value={fromDate} onChange={setFromDate} placeholder="تاریخ شروع" disabled={busy} />
          </div>
          <div className="field"><span className="label">تا تاریخ</span>
            <PersianDatePicker value={toDate} onChange={setToDate} placeholder="تاریخ پایان" disabled={busy} />
          </div>
          <label className="field"><span className="label">سال شمسی پرداخت</span>
            <input className="input" type="number" name="year" min="1300" max="1600" defaultValue={currentYear} required disabled={busy} />
          </label>
        </div>
        {error && <p className="alert alert-error" role="alert">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" disabled={busy || !network}>
            {busy ? "در حال ثبت…" : "ثبت دوره پرداخت"}
          </button>
          <Link href="/production-permits" className="btn btn-outline">بازگشت به مجوزها</Link>
        </div>
      </form>)}
  </DashboardShell>;
}

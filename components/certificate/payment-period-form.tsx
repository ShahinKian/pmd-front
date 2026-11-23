"use client";

import { SearchableSelect } from "@/components/ui/searchable-select";
import { useState, type FormEvent, type ReactNode } from "react";
import { LoaderCircle, Save } from "lucide-react";
import { mutate } from "swr";
import { PersianDatePicker } from "@/components/ui/persian-date-picker";
import { paymentMonths } from "@/lib/certificate/format";
import type { PaymentPeriod } from "@/lib/certificate/types";
import { apiErrorMessage } from "@/lib/http/client";

type PaymentPeriodInput = Pick<PaymentPeriod, "fromDate" | "toDate" | "paymentYear" | "paymentMonth">;

export function refreshPaymentPeriods() {
  void mutate((key) => typeof key === "string" &&
    (key === "/certificate/periods" || /^\/certificate\/networks\/\d+\/periods(?:\/[^/]+\/issue)?$/.test(key)));
}

export function PaymentPeriodForm({ period, saveLabel, onSave, children }: {
  period?: PaymentPeriodInput;
  saveLabel: string;
  onSave: (input: PaymentPeriodInput) => Promise<void>;
  children?: ReactNode;
}) {
  const [fromDate, setFromDate] = useState(period?.fromDate ?? "");
  const [toDate, setToDate] = useState(period?.toDate ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [dateTouched,setDateTouched] = useState(false);
  const currentYear = new Intl.DateTimeFormat("en-u-ca-persian", { year: "numeric", timeZone: "Asia/Tehran" })
    .formatToParts(new Date()).find((part) => part.type === "year")?.value;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setAttempted(true);
    if (!fromDate || !toDate || fromDate > toDate) {
      setError("تاریخ شروع و پایان دوره را بررسی کنید.");
      return;
    }

    const data = new FormData(event.currentTarget);
    const month=Number(data.get("month"));
    const year=Number(data.get("year"));
    if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 1300 || year > 1600) {
      setError("ماه و سال پرداخت را به‌درستی انتخاب کنید.");
      return;
    }
    setBusy(true);
    try {
      await onSave({
        fromDate, toDate, paymentYear: year, paymentMonth: month,
      });
    } catch (cause) {
      setError(apiErrorMessage(cause, "ثبت دورهٔ پرداخت انجام نشد."));
    } finally {
      setBusy(false);
    }
  }

  return <form className="panel grid min-w-0 gap-5 p-4 sm:p-6" onSubmit={submit} noValidate>
    <div><h2 className="text-base font-extrabold">اطلاعات دوره پرداخت</h2><p className="mt-1 text-xs leading-6 text-muted-foreground">دوره و بازه زمانی پرداخت را تکمیل کنید.</p></div>
    <div className="form-grid">
      <label className="field"><span className="label">ماه پرداخت *</span>
        <SearchableSelect className="select" name="month" aria-invalid={attempted && Boolean(error)} defaultValue={period?.paymentMonth ?? ""} required disabled={busy}>
          <option value="">انتخاب ماه</option>
          {paymentMonths.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
        </SearchableSelect>
      </label>
      <div className="field" data-validation={(attempted || dateTouched) && !fromDate ? "error" : undefined}><span className="label">از تاریخ *</span>
        <PersianDatePicker value={fromDate} onChange={value=>{setFromDate(value);setDateTouched(true);}} placeholder="تاریخ شروع" disabled={busy} />
      </div>
      <div className="field" data-validation={(attempted || dateTouched) && (!toDate || Boolean(fromDate && toDate && fromDate > toDate)) ? "error" : undefined}><span className="label">تا تاریخ *</span>
        <PersianDatePicker value={toDate} onChange={value=>{setToDate(value);setDateTouched(true);}} placeholder="تاریخ پایان" disabled={busy} />
      </div>
      <label className="field"><span className="label">سال شمسی پرداخت *</span>
        <input className="input" type="number" inputMode="numeric" dir="ltr" name="year" min={1300} max={1600}
          defaultValue={period?.paymentYear ?? currentYear} required disabled={busy} />
      </label>
    </div>
    {error && <p className="alert alert-error" role="alert">{error}</p>}
    <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:flex-wrap sm:justify-end">
      <button className="btn btn-primary w-full justify-center sm:w-auto" disabled={busy}>{busy ? <LoaderCircle className="animate-spin" size={16} aria-hidden /> : <Save size={16} aria-hidden />}{busy ? "در حال ثبت…" : saveLabel}</button>
      {children}
    </div>
  </form>;
}

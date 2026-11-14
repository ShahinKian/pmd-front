"use client";

import { useState, type FormEvent, type ReactNode } from "react";
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
  const currentYear = new Intl.DateTimeFormat("en-u-ca-persian", { year: "numeric", timeZone: "Asia/Tehran" })
    .formatToParts(new Date()).find((part) => part.type === "year")?.value;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (!fromDate || !toDate || fromDate > toDate) {
      setError("تاریخ شروع و پایان دوره را بررسی کنید.");
      return;
    }

    const data = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await onSave({
        fromDate, toDate, paymentYear: Number(data.get("year")), paymentMonth: Number(data.get("month")),
      });
    } catch (cause) {
      setError(apiErrorMessage(cause, "ثبت دورهٔ پرداخت انجام نشد."));
    } finally {
      setBusy(false);
    }
  }

  return <form className="card grid gap-4" onSubmit={submit}>
    <div className="form-grid">
      <label className="field"><span className="label">ماه پرداخت</span>
        <select className="select" name="month" defaultValue={period?.paymentMonth ?? ""} required disabled={busy}>
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
        <input className="input" type="number" name="year" min="1300" max="1600"
          defaultValue={period?.paymentYear ?? currentYear} required disabled={busy} />
      </label>
    </div>
    {error && <p className="alert alert-error" role="alert">{error}</p>}
    <div className="flex flex-wrap gap-2">
      <button className="btn btn-primary" disabled={busy}>{busy ? "در حال ثبت…" : saveLabel}</button>
      {children}
    </div>
  </form>;
}

"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import useSWR from "swr";
import DashboardShell, { Breadcrumb } from "@/components/layout/dashboard-shell";
import { NetworkSelect } from "@/components/certificate/network-select";
import { useSession } from "@/hooks/use-session";
import { certificateAccess } from "@/lib/certificate/access";
import { amountExceeds, displayDate, displayNumber, parseDeduction, paymentMonths } from "@/lib/certificate/format";
import type { Money, PaymentPeriod, PermitDetail, PermitIssuePreparation, PermitSummary, PersonnelPayment } from "@/lib/certificate/types";
import type { BaseInfoListResponse } from "@/lib/base-info/browser-types";
import { apiClient, apiErrorMessage } from "@/lib/http/client";

const title = "مجوز قطعی برنامه‌های تولیدی";
const statusLabels: Record<PermitSummary["status"], string> = {
  Draft: "پیش‌نویس", Approved: "تأییدشده", SentToFinance: "ارسال‌شده به مالی",
};

export default function ProductionPermitsPage() {
  const { data: session, error: sessionError, isLoading: sessionLoading } = useSession();
  const access = certificateAccess(session);
  const [network, setNetwork] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [permitId, setPermitId] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const base = access.canRead && network ? `/certificate/networks/${network}` : null;
  const periods = useSWR<PaymentPeriod[]>(base ? `${base}/periods` : null);
  const permits = useSWR<PermitSummary[]>(base && periodId ? `${base}/periods/${periodId}/permits` : null);
  const detail = useSWR<PermitDetail>(base && periodId && permitId ? `${base}/permits/${permitId}` : null);
  const plans = useSWR<BaseInfoListResponse>(base ? `/base-info/plans/${network}` : null);
  const planTitles = new Map(Array.isArray(plans.data?.Data) ? plans.data.Data.map((plan) => [Number(plan.Value), plan.Text]) : []);
  const planTitle = (id: number) => planTitles.get(id) || `برنامه با شناسه طرح ${displayNumber(id)}`;
  const period = periods.data?.find((item) => item.id === periodId);
  const preparation = useSWR<PermitIssuePreparation>(
    base && access.canIssue && period?.isActive && !period.issuedAt ? `${base}/periods/${period.id}/issue` : null);

  async function run(label: string, action: () => Promise<void>, success: string) {
    if (busy) return;
    setBusy(label);
    setMessage(null);
    try {
      await action();
      setMessage({ text: success });
    } catch (cause) {
      setMessage({ text: apiErrorMessage(cause, "عملیات انجام نشد."), error: true });
      await Promise.allSettled([periods.mutate(), permits.mutate(), detail.mutate(), preparation.mutate()]);
    } finally {
      setBusy("");
    }
  }

  function issue() {
    if (!base || !period?.isActive || !preparation.data?.planIds.length) return;
    void run("issue", async () => {
      const { data: issued } = await apiClient.post<PermitSummary[]>(
        `${base}/periods/${period.id}/issue`, undefined, { timeout: 125_000 });
      await Promise.all([periods.mutate(), permits.mutate(issued, { revalidate: false })]);
    }, "پیش‌نویس مجوز برنامه‌ها ثبت شد.");
  }

  function saveDeduction(personnelId: number, amount: Money) {
    if (!base || !detail.data) return;
    const { id, version } = detail.data.permit;
    void run("deduct", async () => {
      await apiClient.put(`${base}/permits/${id}/personnel/${personnelId}/deduction`, { amount, version });
      await Promise.all([detail.mutate(), permits.mutate()]);
    }, "کسورات موظفی ثبت شد.");
  }

  function transition(action: "approve" | "send-to-finance") {
    if (!base || !detail.data) return;
    const { id, version } = detail.data.permit;
    void run(action, async () => {
      await apiClient.post(`${base}/permits/${id}/${action}`, { version });
      await Promise.all([detail.mutate(), permits.mutate()]);
    }, action === "approve" ? "سند تأیید شد." : "سند به کارتابل مالی ارسال شد.");
  }

  const loadError = sessionError || periods.error || permits.error || detail.error;

  return <DashboardShell>
    <Breadcrumb items={[{ label: "داشبورد", href: "/dashboard" }, { label: title }]} />
    <div className="page-head"><div>
      <h1 className="page-title">{title}</h1>
      {access.financeOnly && <p className="page-description">اسناد ارسالی به کارتابل مالی</p>}
    </div>
      {session && access.canCreatePeriod &&
        <Link href="/production-permits/periods" className="btn btn-primary">دوره‌های پرداخت</Link>}
    </div>
    {sessionLoading && <p role="status">در حال بررسی دسترسی…</p>}
    {session && access.canRead && !access.canIssue && !access.financeOnly &&
      <p className="page-description mb-4">صدور پیش‌نویس در دسترسی نقش «اطلاعات برنامه‌ریزی» است.</p>}
    {session && !access.canRead && <p role="alert">دسترسی مشاهده مجوزهای تولیدی را ندارید.</p>}
    {loadError && <p className="alert alert-error" role="alert">{apiErrorMessage(loadError, "دریافت اطلاعات مجوز انجام نشد.")}</p>}
    {message && <p className={`alert mb-4 ${message.error ? "alert-error" : "alert-success"}`}
      role={message.error ? "alert" : "status"}>{message.text}</p>}
    {session && access.canRead && <div className="grid gap-4">
      <section className="card grid gap-4">
        <div className="form-grid">
          <NetworkSelect session={session} value={network} disabled={Boolean(busy)} onChange={(value) => {
            setNetwork(value); setPeriodId(""); setPermitId(""); setMessage(null);
          }} />
          {base && <label className="field">
            <span className="label">دوره پرداخت</span>
            <select className="select" value={periodId} disabled={Boolean(busy) || periods.isLoading} onChange={(event) => {
              setPeriodId(event.target.value); setPermitId(""); setMessage(null);
            }}>
              <option value="">{periods.isLoading ? "در حال بارگذاری…" : periods.data?.length === 0 ? "دوره‌ای ثبت نشده است" : "انتخاب دوره"}</option>
              {periods.data?.map((item) => <option key={item.id} value={item.id}>
                {paymentMonths[item.paymentMonth - 1]} {displayNumber(item.paymentYear)} · {displayDate(item.fromDate)} تا {displayDate(item.toDate)}
                {!item.isActive && " · غیرفعال"}
              </option>)}
            </select>
          </label>}
        </div>
        {access.canIssue && period?.issuedAt && <p>صدور این دوره برای شبکهٔ انتخاب‌شده انجام شده است.</p>}
        {access.canIssue && period && !period.isActive && !period.issuedAt &&
          <p>این دوره غیرفعال است. مدیر سیستم می‌تواند آن را دوباره فعال کند.</p>}
      </section>
      {access.canIssue && period?.isActive && !period.issuedAt && <section className="card grid gap-3">
        <h2 className="font-semibold">بررسی شناسنامه‌ها برای صدور</h2>
        {preparation.isLoading && <p role="status">در حال بررسی شناسنامه‌ها…</p>}
        {preparation.error && <p role="alert" className="alert alert-error">
          {apiErrorMessage(preparation.error, "بررسی شناسنامه‌ها انجام نشد.")}
        </p>}
        {preparation.data?.alreadyIssued && <p>صدور این دوره برای شبکهٔ انتخاب‌شده انجام شده است.</p>}
        {preparation.data && !preparation.data.alreadyIssued && <>
          {preparation.data.profiles.length === 0
            ? <p>در این شبکه، شناسنامه‌ای با وضعیت «تأیید نهایی» و تاریخ پخش داخل بازهٔ این دوره پیدا نشد.</p>
            : <div className="overflow-x-auto"><table className="w-full text-right text-sm [&_td]:p-2 [&_th]:p-2">
                <thead><tr><th>برنامه</th><th>قسمت</th><th>تاریخ پخش</th><th>نحوه تولید</th><th>وضعیت صدور</th></tr></thead>
                <tbody>{preparation.data.profiles.map((profile) => <tr key={profile.profileId} className="border-t">
                  <td>{planTitle(profile.planId)}</td><td>{displayNumber(profile.episodeNumber)}</td>
                  <td>{displayDate(profile.broadcastDate)}</td><td>{profile.productionMethod || "ثبت نشده"}</td>
                  <td>{profile.eligible ? "واجد شرایط" : "نیاز به نحوه تولید «تولیدی»"}</td>
                </tr>)}</tbody>
              </table></div>}
          {preparation.data.planIds.length > 0 && <div>
            <button type="button" className="btn btn-primary" disabled={Boolean(busy)} onClick={issue}>
              {busy === "issue" ? "در حال محاسبه برنامه‌های شبکه…" : "صدور پیش‌نویس مجوز قطعی"}
            </button>
          </div>}
        </>}
      </section>}
      {period && <section className="card grid gap-3">
        <h2 className="font-semibold">اسناد برنامه‌ها</h2>
        {permits.isLoading && <p role="status">در حال بارگذاری اسناد…</p>}
        {permits.data?.length === 0 && <p>برای این دوره سند مجوزی ثبت نشده است.</p>}
        {Boolean(permits.data?.length) && <div className="overflow-x-auto"><table className="w-full text-right text-sm [&_td]:p-2 [&_th]:p-2">
          <thead><tr><th>برنامه</th><th>قسمت‌ها</th><th>وضعیت</th><th>ناخالص</th><th>کسورات</th><th>قابل پرداخت</th><th>سند</th></tr></thead>
          <tbody>{permits.data?.map((permit) => <tr key={permit.id} className="border-t">
            <td>{planTitle(permit.planId)}</td><td>{displayNumber(permit.episodeCount)}</td><td>{statusLabels[permit.status]}</td>
            <td>{displayNumber(permit.grossAmount)}</td><td>{displayNumber(permit.deductionAmount)}</td><td>{displayNumber(permit.netAmount)}</td>
            <td><button className="btn btn-outline whitespace-nowrap" type="button" disabled={Boolean(busy)} aria-pressed={permitId === permit.id}
              onClick={() => { setPermitId(permit.id); setMessage(null); }}>مشاهده سند</button></td>
          </tr>)}</tbody>
        </table></div>}
      </section>}
      {detail.isLoading && <p role="status">در حال بارگذاری سند…</p>}
      {detail.data && <section className="card grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-semibold">{planTitle(detail.data.permit.planId)}</h2>
            <p>{statusLabels[detail.data.permit.status]} · قابل پرداخت {displayNumber(detail.data.permit.netAmount)}</p></div>
          {access.canApprove && detail.data.permit.status !== "SentToFinance" &&
            <button className="btn btn-primary" type="button" disabled={Boolean(busy)} onClick={() =>
              transition(detail.data?.permit.status === "Draft" ? "approve" : "send-to-finance")}>
              {detail.data.permit.status === "Draft" ? "تأیید سند" : "ارسال به مالی"}
            </button>}
        </div>
        <details>
          <summary className="cursor-pointer">قسمت‌های مشمول</summary>
          <ul className="mt-2 list-inside list-disc">{detail.data.episodes.map((episode) =>
            <li key={episode.profileId}>قسمت {displayNumber(episode.episodeNumber)} · {displayDate(episode.broadcastDate)}</li>)}</ul>
        </details>
        {detail.data.payments.length === 0 ? <p>حضور قابل پرداختی برای این برنامه ثبت نشده است.</p> :
          <div className="overflow-x-auto"><table className="w-full text-right text-sm [&_td]:p-2 [&_th]:p-2">
            <thead><tr><th>عامل و نرخ هر قسمت</th><th>تعداد حضور</th><th>ناخالص</th><th>کسورات موظفی</th><th>قابل پرداخت</th></tr></thead>
            <tbody>{detail.data.payments.map((payment) => <tr key={payment.personnelId} className="border-t align-top">
              <td><details>
                <summary className="cursor-pointer">{payment.personnelName}{payment.isDutyCrew ? " · موظفی" : ""}</summary>
                <ul className="mt-2 space-y-1">{payment.lines.map((line) => <li key={`${line.episodeNumber}-${line.activityTypeId}`}>
                  قسمت {displayNumber(line.episodeNumber)} · {line.activityTypeName || displayNumber(line.activityTypeId)} · {displayNumber(line.rate)}
                </li>)}</ul>
              </details></td>
              <td>{displayNumber(payment.attendanceCount)}</td><td>{displayNumber(payment.grossAmount)}</td>
              <td>{payment.isDutyCrew && access.canDeduct && detail.data?.permit.status === "Draft"
                ? <DeductionForm key={`${detail.data.permit.id}-${payment.deduction}`} payment={payment} busy={Boolean(busy)} save={saveDeduction} />
                : displayNumber(payment.deduction)}</td>
              <td>{displayNumber(payment.netAmount)}</td>
            </tr>)}</tbody>
          </table></div>}
      </section>}
    </div>}
  </DashboardShell>;
}

function DeductionForm({ payment, busy, save }: {
  payment: PersonnelPayment;
  busy: boolean;
  save: (id: number, amount: Money) => void;
}) {
  const [value, setValue] = useState(String(payment.deduction));
  const [invalid, setInvalid] = useState(false);

  return <form className="grid min-w-36 gap-1" onSubmit={(event) => {
    event.preventDefault();
    const amount = parseDeduction(value);
    if (amount === null || amountExceeds(amount, payment.grossAmount)) {
      setInvalid(true);
      return;
    }
    save(payment.personnelId, amount);
  }}>
    <div className="flex gap-1">
      <input className="input" inputMode="decimal" aria-label={`کسورات ${payment.personnelName}`} aria-invalid={invalid}
        value={value} disabled={busy} onChange={(event) => { setValue(event.target.value); setInvalid(false); }} />
      <button className="btn btn-outline" disabled={busy}>ثبت</button>
    </div>
    {invalid && <span role="alert">مبلغی بین صفر و ناخالص وارد کنید.</span>}
  </form>;
}

"use client";

import { GroupedNumberInput } from "@/components/ui/grouped-number-input";

import { useNetworkScope } from "@/hooks/use-network-scope";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowDownUp, Calculator, CalendarDays, CheckCheck, Eye, FileCheck, Files, Save, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import DashboardShell, { Breadcrumb } from "@/components/layout/dashboard-shell";
import { NetworkSelect } from "@/components/ui/network-field";
import { useSession } from "@/hooks/use-session";
import { certificateAccess } from "@/lib/certificate/access";
import { amountExceeds, displayDate, displayMoney, displayNumber, parseDeduction, paymentMonths } from "@/lib/certificate/format";
import type { Money, PaymentPeriod, PermitDetail, PermitIssuePreparation, PermitSummary, PersonnelPayment } from "@/lib/certificate/types";
import { apiClient, apiErrorMessage } from "@/lib/http/client";

const statusLabels: Record<PermitSummary["status"], string> = {
  Draft: "پیش‌نویس", Approved: "تأییدشده", SentToFinance: "ارسال‌شده به مالی",
};

export function ProductionPermits({ mode, initialNetwork = "", initialPeriod = "" }: {
  mode: "issue" | "issued";
  initialNetwork?: string;
  initialPeriod?: string;
}) {
  const router = useRouter();
  const issuedMode = mode === "issued";
  const title = issuedMode ? "مجوزهای صادرشده" : "صدور مجوز قطعی";
  const { data: session, error: sessionError, isLoading: sessionLoading } = useSession();
  const access = certificateAccess(session);
  const [selectedNetwork, setNetwork] = useState(initialNetwork);
  const { networkId: network, loading: networkLoading } = useNetworkScope(session, selectedNetwork);
  const [paymentPeriod, setPaymentPeriod] = useState({ network: initialNetwork, id: initialPeriod });
  const periodId = Number(paymentPeriod.network) === Number(network) ? paymentPeriod.id : "";
  const [status, setStatus] = useState<PermitSummary["status"] | "">("");
  const [sort,setSort] = useState<{key:"planId"|"episodeCount"|"status"|"grossAmount"|"netAmount";direction:"asc"|"desc"}>({key:"planId",direction:"asc"});
  function toggleSort(key:typeof sort.key){setSort(current=>({key,direction:current.key===key&&current.direction==="asc"?"desc":"asc"}));}
  const [permitId, setPermitId] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const base = access.canRead && network ? `/certificate/networks/${network}` : null;
  const periods = useSWR<PaymentPeriod[]>(base ? `${base}/periods` : null);
  const permits = useSWR<PermitSummary[]>(issuedMode && base && periodId ? `${base}/periods/${periodId}/permits` : null);
  const detail = useSWR<PermitDetail>(issuedMode && base && periodId && permitId ? `${base}/permits/${permitId}` : null);
  const planTitle = (id: number, name?: string | null) => name?.trim() || `برنامه با شناسه طرح ${displayNumber(id)}`;
  const period = periods.data?.find((item) => item.id === periodId);
  const canPrepare = Boolean(!issuedMode && base && access.canIssue && period?.isActive && !period.issuedAt);
  const preparation = useSWR<PermitIssuePreparation>(canPrepare ? `${base}/periods/${periodId}/issue` : null);
  const readyPlans = preparation.data?.planIds.length ?? 0;
  const issuedHref = `/production-permits/issued?${new URLSearchParams({ network, periodId })}`;
  const visiblePermits = permits.data?.filter((permit) => !status || permit.status === status).sort((a,b)=>{
    const aValue=a[sort.key]; const bValue=b[sort.key];
    const numeric=(value:unknown)=>typeof value==="number"?value:Number(value);
    const av=numeric(aValue),bv=numeric(bValue);
    const result=Number.isFinite(av)&&Number.isFinite(bv)?av-bv:String(aValue).localeCompare(String(bValue),"fa",{numeric:true});
    return sort.direction==="asc"?result:-result;
  });

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
    if (!base || !canPrepare || preparation.error || !readyPlans) return;
    void run("issue", async () => {
      await apiClient.post<PermitSummary[]>(
        `${base}/periods/${periodId}/issue`, undefined, { timeout: 125_000 });
      await periods.mutate();
      router.push(issuedHref);
    }, "مبالغ محاسبه و پیش‌نویس مجوز برنامه‌ها ثبت شد.");
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
      if (status) setStatus(action === "approve" ? "Approved" : "SentToFinance");
    }, action === "approve" ? "سند تأیید شد." : "سند به کارتابل مالی ارسال شد.");
  }

  const loadError = sessionError || periods.error || permits.error || detail.error;

  return <DashboardShell>
    <Breadcrumb items={[{ label: "داشبورد", href: "/dashboard" }, { label: title }]} />
    <div className="page-head"><div>
      <h1 className="page-title">{title}</h1>
      {access.financeOnly && <p className="page-description">اسناد ارسالی به کارتابل مالی</p>}
    </div>
      {session && access.canRead && <div className="flex flex-wrap gap-2">
        {issuedMode && access.canIssue && <Link href="/production-permits" className="btn btn-outline"><FileCheck size={16} aria-hidden />صدور مجوز قطعی</Link>}
        {!issuedMode && <Link href={issuedHref} className="btn btn-info"><Files size={16} aria-hidden />مجوزهای صادرشده</Link>}
        {access.canCreatePeriod && <Link href="/production-permits/periods" className="btn btn-outline"><CalendarDays size={16} aria-hidden />دوره‌های پرداخت</Link>}
      </div>}
    </div>
    {sessionLoading && <p role="status">در حال بررسی دسترسی…</p>}
    {session && !access.canRead && <p role="alert">دسترسی مشاهده مجوزهای قطعی را ندارید.</p>}
    {loadError && <p className="alert alert-error" role="alert">{apiErrorMessage(loadError, "دریافت اطلاعات مجوز انجام نشد.")}</p>}
    {message && <p className={`alert mb-4 ${message.error ? "alert-error" : "alert-success"}`}
      role={message.error ? "alert" : "status"}>{message.text}</p>}
    {session && (issuedMode ? access.canRead : access.canIssue) && <div className="grid gap-4">
      <section className="card grid gap-4">
        <div className="form-grid">
          <NetworkSelect session={session} value={network} loading={networkLoading} disabled={Boolean(busy)} onChange={(value) => {
            setNetwork(value); setPaymentPeriod({ network: value, id: "" }); setStatus(""); setPermitId(""); setMessage(null);
          }} />
          {base && <label className="field">
            <span className="label">دوره پرداخت</span>
            <SearchableSelect className="select" value={periodId} disabled={Boolean(busy) || periods.isLoading} onChange={(event) => {
              setPaymentPeriod({ network, id: event.target.value }); setStatus(""); setPermitId(""); setMessage(null);
            }}>
              <option value="">{periods.isLoading ? "در حال بارگذاری…" : periods.data?.length === 0 ? "دوره‌ای ثبت نشده است" : "انتخاب دوره"}</option>
              {periods.data?.map((item) => <option key={item.id} value={item.id}>
                {paymentMonths[item.paymentMonth - 1]} {displayNumber(item.paymentYear)} · {displayDate(item.fromDate)} تا {displayDate(item.toDate)}
                {!item.isActive && " · غیرفعال"}
              </option>)}
            </SearchableSelect>
          </label>}
          {issuedMode && period && !access.financeOnly && <label className="field">
            <span className="label">وضعیت سند</span>
            <SearchableSelect className="select" value={status} disabled={Boolean(busy)} onChange={(event) => {
              setStatus(event.target.value as PermitSummary["status"] | ""); setPermitId(""); setMessage(null);
            }}>
              <option value="">همه وضعیت‌ها</option>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </SearchableSelect>
          </label>}
        </div>
        {!issuedMode && access.canIssue && period?.issuedAt && <p>صدور این دوره انجام شده است. <Link className="underline" href={issuedHref}>مشاهده مجوزهای این دوره</Link></p>}
        {!issuedMode && access.canIssue && period && !period.isActive && !period.issuedAt &&
          <p>این دوره غیرفعال است. مدیر سیستم می‌تواند آن را دوباره فعال کند.</p>}
      </section>
      {canPrepare && <section className="card grid gap-3">
        <h2 className="font-semibold">شناسنامه‌های تأیید نهایی برای صدور مجوز</h2>
        {preparation.isLoading && <p role="status">در حال بررسی شناسنامه‌ها…</p>}
        {preparation.error && <p role="alert" className="alert alert-error">
          {apiErrorMessage(preparation.error, "بررسی شناسنامه‌ها انجام نشد.")}
        </p>}
        {preparation.data?.alreadyIssued && <p>صدور این دوره برای شبکهٔ انتخاب‌شده انجام شده است.</p>}
        {preparation.data && !preparation.error && !preparation.data.alreadyIssued && <>
          {readyPlans > 0 && <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn btn-success" disabled={Boolean(busy)} onClick={issue}>
              <Calculator size={16} aria-hidden />
              {busy === "issue" ? "در حال محاسبه برنامه‌های شبکه…" : "محاسبه و صدور پیش‌نویس مجوز قطعی"}
            </button>
            <p>{displayNumber(readyPlans)} برنامه آماده صدور است.</p>
          </div>}
          {preparation.data.profiles.length === 0
            ? <p>در این شبکه، شناسنامه‌ای با وضعیت «تأیید نهایی» و تاریخ پخش داخل بازهٔ این دوره پیدا نشد.</p>
            : <div className="overflow-x-auto"><table className="w-full text-right text-sm [&_td]:p-2 [&_th]:p-2">
                <thead><tr><th>برنامه</th><th>قسمت</th><th>تاریخ پخش</th></tr></thead>
                <tbody>{preparation.data.profiles.map((profile) => <tr key={profile.profileId} className="border-t">
                  <td>{planTitle(profile.planId)}{profile.mainTopic?.trim() && <div>موضوع {profile.mainTopic}</div>}</td>
                  <td>{displayNumber(profile.episodeNumber)}</td>
                  <td>{displayDate(profile.broadcastDate)}</td>
                </tr>)}</tbody>
              </table></div>}
        </>}
      </section>}
      {issuedMode && period && <section className="card grid gap-3">
        <h2 className="font-semibold">اسناد برنامه‌ها</h2>
        {permits.isLoading && <p role="status">در حال بارگذاری اسناد…</p>}
        {visiblePermits?.length === 0 && <p>سندی با فیلترهای انتخاب‌شده پیدا نشد.</p>}
        {Boolean(visiblePermits?.length) && <div className="overflow-x-auto"><table className="w-full text-right text-sm [&_td]:p-2 [&_th]:p-2">
          <thead><tr><th><button type="button" className="pmd-sort-button" onClick={()=>toggleSort("planId")}>برنامه<ArrowDownUp size={14} aria-hidden/>{sort.key==="planId"?<span>{sort.direction==="asc"?"↑":"↓"}</span>:null}</button></th><th>قسمت‌ها</th><th>وضعیت</th><th>ناخالص</th><th>کسورات</th><th>قابل پرداخت</th><th>سند</th></tr></thead>
          <tbody>{visiblePermits?.map((permit) => <tr key={permit.id} className="border-t">
            <td>{planTitle(permit.planId, permit.planName)}</td><td>{displayNumber(permit.episodeCount)}</td><td><span className="table-tag">{statusLabels[permit.status]}</span></td>
            <td>{displayMoney(permit.grossAmount)}</td><td>{displayMoney(permit.deductionAmount)}</td><td>{displayMoney(permit.netAmount)}</td>
            <td><button className="btn btn-info" type="button" disabled={Boolean(busy)} aria-pressed={permitId === permit.id}
              onClick={() => { setPermitId(permit.id); setMessage(null); }}><Eye size={15} aria-hidden />مشاهده سند</button></td>
          </tr>)}</tbody>
        </table></div>}
      </section>}
      {detail.isLoading && <p role="status">در حال بارگذاری سند…</p>}
      {detail.data && <section className="card grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-semibold">{planTitle(detail.data.permit.planId, detail.data.permit.planName)}</h2>
            <p>{statusLabels[detail.data.permit.status]} · قابل پرداخت {displayMoney(detail.data.permit.netAmount)}</p></div>
          {access.canApprove && detail.data.permit.status !== "SentToFinance" &&
            <button className={detail.data.permit.status === "Draft" ? "btn btn-success" : "btn btn-primary"} type="button" disabled={Boolean(busy)} onClick={() =>
              transition(detail.data?.permit.status === "Draft" ? "approve" : "send-to-finance")}>
              {detail.data.permit.status === "Draft"
                ? <><CheckCheck size={16} aria-hidden />تأیید سند</>
                : <><Send size={16} aria-hidden />ارسال به مالی</>}
            </button>}
        </div>
        <details>
          <summary className="cursor-pointer">قسمت‌های مشمول</summary>
          <ul className="mt-2 list-inside list-disc">{detail.data.episodes.map((episode) =>
            <li key={episode.profileId}>قسمت {displayNumber(episode.episodeNumber)} · {displayDate(episode.broadcastDate)}</li>)}</ul>
        </details>
        {detail.data.payments.length === 0 ? <p>حضور قابل پرداختی برای این برنامه ثبت نشده است.</p> :
          <div className="overflow-x-auto"><table className="w-full text-right text-sm [&_td]:p-2 [&_th]:p-2">
            <thead><tr><th>عامل و نرخ هر قسمت</th><th>تعداد حضور</th><th>ناخالص</th><th>موظفی (کسورات)</th><th>قابل پرداخت</th></tr></thead>
            <tbody>{detail.data.payments.map((payment) => <tr key={payment.personnelId} className="border-t align-top">
              <td><details>
                <summary className="cursor-pointer">{payment.personnelName}{payment.isDutyCrew ? " · موظفی" : ""}</summary>
                <ul className="mt-2 space-y-1">{payment.lines.map((line) => <li key={`${line.episodeNumber}-${line.activityTypeId}`}>
                  قسمت {displayNumber(line.episodeNumber)} · {line.activityTypeName || displayNumber(line.activityTypeId)} · {displayMoney(line.rate)}
                </li>)}</ul>
              </details></td>
              <td>{displayNumber(payment.attendanceCount)}</td><td>{displayMoney(payment.grossAmount)}</td>
              <td>{payment.isDutyCrew && access.canDeduct && detail.data?.permit.status === "Draft"
                ? <DeductionForm key={`${detail.data.permit.id}-${payment.deduction}`} payment={payment} busy={Boolean(busy)} save={saveDeduction} />
                : payment.isDutyCrew ? displayMoney(payment.deduction) : "—"}</td>
              <td>{displayMoney(payment.netAmount)}</td>
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
  const suggested = payment.suggestedDutyDeduction;
  const applicable = suggested == null ? null : amountExceeds(suggested, payment.grossAmount) ? payment.grossAmount : suggested;

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
      <GroupedNumberInput decimalPlaces={2} min={0} aria-label={`مبلغ کسورات موظفی ${payment.personnelName}`} aria-invalid={invalid}
        value={value} disabled={busy} onValueChange={(next) => { setValue(next); setInvalid(false); }} />
      <button className="btn btn-success" disabled={busy}><Save size={15} aria-hidden />ثبت کسورات</button>
    </div>
    {suggested != null && applicable != null && applicable !== payment.deduction && <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-default-600">مبلغ تعریف‌شده {displayMoney(suggested)}</span>
      <button className="btn btn-info" type="button" disabled={busy} onClick={() => {
        setValue(applicable); setInvalid(false);
      }}>انتقال به کادر کسورات</button>
      {applicable !== suggested && <span className="text-xs text-default-600">حداکثر قابل کسر {displayMoney(applicable)}</span>}
    </div>}
    {invalid && <span className="text-sm text-destructive" role="alert">مبلغی بین صفر و ناخالص وارد کنید.</span>}
  </form>;
}

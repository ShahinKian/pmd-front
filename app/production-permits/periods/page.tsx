"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDownUp, CalendarPlus, Pencil, Power, X } from "lucide-react";
import useSWR from "swr";
import DashboardShell, { Breadcrumb } from "@/components/layout/dashboard-shell";
import { PaymentPeriodForm, refreshPaymentPeriods } from "@/components/certificate/payment-period-form";
import { useSession } from "@/hooks/use-session";
import { certificateAccess } from "@/lib/certificate/access";
import { displayDate, displayNumber, paymentMonths } from "@/lib/certificate/format";
import type { ManagedPaymentPeriod } from "@/lib/certificate/types";
import { apiClient, apiErrorMessage } from "@/lib/http/client";

const path = "/certificate/periods";

export default function PaymentPeriodsPage() {
  const { data: session, error: sessionError, isLoading } = useSession();
  const { canCreatePeriod } = certificateAccess(session);
  const periods = useSWR<ManagedPaymentPeriod[]>(canCreatePeriod ? path : null);
  const [editing, setEditing] = useState<ManagedPaymentPeriod | null>(null);
  const [busy, setBusy] = useState(false);
  const [sort,setSort]=useState<{key:"period"|"fromDate"|"toDate"|"isActive";direction:"asc"|"desc"}>({key:"period",direction:"desc"});
  function toggleSort(key:typeof sort.key){setSort(previous=>({key,direction:previous.key===key&&previous.direction==="asc"?"desc":"asc"}));}
  const sortedPeriods=[...(periods.data??[])].sort((a,b)=>{
    const value=(period:ManagedPaymentPeriod)=>sort.key==="period"?period.paymentYear*100+period.paymentMonth:sort.key==="isActive"?Number(period.isActive):period[sort.key];
    const va=value(a);const vb=value(b);
    const result=typeof va==="number"&&typeof vb==="number"?va-vb:String(va).localeCompare(String(vb),"fa",{numeric:true});
    return sort.direction==="asc"?result:-result;
  });
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);

  async function changeState(period: ManagedPaymentPeriod) {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      await apiClient.put(`${path}/${period.id}/state`, { isActive: !period.isActive, version: period.version });
      setNotice({ text: period.isActive ? "دوره غیرفعال شد." : "دوره فعال شد." });
      refreshPaymentPeriods();
    } catch (cause) {
      setNotice({ text: apiErrorMessage(cause, "تغییر وضعیت دوره انجام نشد."), error: true });
      await periods.mutate();
    } finally {
      setBusy(false);
    }
  }

  const error = sessionError || periods.error;
  return <DashboardShell>
    <Breadcrumb items={[
      { label: "داشبورد", href: "/dashboard" },
      { label: "مجوزهای قطعی", href: "/production-permits" },
      { label: "دوره‌های پرداخت" },
    ]} />
    <div className="page-head">
      <h1 className="page-title">دوره‌های پرداخت</h1>
      {canCreatePeriod && <Link href="/production-permits/periods/new" className="btn btn-primary"><CalendarPlus size={16} aria-hidden />تعریف دوره پرداخت</Link>}
    </div>
    {(isLoading || periods.isLoading) && <p role="status">در حال بارگذاری…</p>}
    {session && !canCreatePeriod && <p role="alert">مدیریت دوره‌های پرداخت در دسترسی مدیر سیستم است.</p>}
    {error && <p className="alert alert-error" role="alert">{apiErrorMessage(error, "فهرست دوره‌ها دریافت نشد.")}</p>}
    {notice && <p className={`alert mb-4 ${notice.error ? "alert-error" : "alert-success"}`}
      role={notice.error ? "alert" : "status"}>{notice.text}</p>}
    {canCreatePeriod && <div className="grid gap-4">
      {editing && <section aria-labelledby="edit-period-title" className="grid gap-2">
        <h2 id="edit-period-title" className="font-semibold">ویرایش دوره پرداخت</h2>
        <PaymentPeriodForm key={editing.id} period={editing} saveLabel="ذخیره تغییرات" onSave={async (input) => {
          await apiClient.put(`${path}/${editing.id}`, { ...input, version: editing.version });
          setEditing(null);
          setNotice({ text: "دوره پرداخت ویرایش شد." });
          refreshPaymentPeriods();
        }}>
          <button type="button" className="btn btn-outline" onClick={() => setEditing(null)}><X size={15} aria-hidden />انصراف</button>
        </PaymentPeriodForm>
      </section>}
      <section className="card">
        {periods.data?.length === 0 && <p>هنوز دوره‌ای ثبت نشده است.</p>}
        {Boolean(periods.data?.length) && <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th><button type="button" className="pmd-sort-button" onClick={()=>toggleSort("period")}>ماه پرداخت<ArrowDownUp size={14} aria-hidden/>{sort.key==="period"?<span>{sort.direction==="asc"?"↑":"↓"}</span>:null}</button></th><th><button type="button" className="pmd-sort-button" onClick={()=>toggleSort("fromDate")}>از تاریخ<ArrowDownUp size={14} aria-hidden/>{sort.key==="fromDate"?<span>{sort.direction==="asc"?"↑":"↓"}</span>:null}</button></th><th><button type="button" className="pmd-sort-button" onClick={()=>toggleSort("toDate")}>تا تاریخ<ArrowDownUp size={14} aria-hidden/>{sort.key==="toDate"?<span>{sort.direction==="asc"?"↑":"↓"}</span>:null}</button></th><th>دامنه</th><th><button type="button" className="pmd-sort-button" onClick={()=>toggleSort("isActive")}>وضعیت<ArrowDownUp size={14} aria-hidden/>{sort.key==="isActive"?<span>{sort.direction==="asc"?"↑":"↓"}</span>:null}</button></th><th>عملیات</th></tr></thead>
            <tbody>{sortedPeriods.map((period) => <tr key={period.id} className="border-t">
              <td>{paymentMonths[period.paymentMonth - 1]} {displayNumber(period.paymentYear)}</td>
              <td>{displayDate(period.fromDate)}</td><td>{displayDate(period.toDate)}</td>
              <td>{period.legacyNetworkId == null ? "همه شبکه‌ها" : `شبکه ${displayNumber(period.legacyNetworkId)}`}</td>
              <td><span className="table-tag">{period.isActive ? "فعال" : "غیرفعال"}</span></td>
              <td><div className="flex flex-wrap items-center gap-2">
                {period.hasIssuance ? <span>مجوز صادر شده</span> :
                  <button type="button" className="btn btn-outline" disabled={busy || Boolean(editing)}
                    onClick={() => { setEditing(period); setNotice(null); }}><Pencil size={15} aria-hidden />ویرایش</button>}
                <button type="button" className={period.isActive ? "btn btn-warning" : "btn btn-success"} disabled={busy || Boolean(editing)}
                  onClick={() => void changeState(period)}><Power size={15} aria-hidden />{period.isActive ? "غیرفعال کردن" : "فعال کردن"}</button>
              </div></td>
            </tr>)}</tbody>
          </table>
        </div>}
      </section>
    </div>}
  </DashboardShell>;
}

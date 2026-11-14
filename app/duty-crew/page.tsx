"use client";

import { useState, type FormEvent } from "react";
import useSWR from "swr";
import DashboardShell, { Breadcrumb } from "@/components/layout/dashboard-shell";
import { NetworkSelect } from "@/components/certificate/network-select";
import { useSession } from "@/hooks/use-session";
import { certificateAccess } from "@/lib/certificate/access";
import type { DutyCrewMember } from "@/lib/certificate/types";
import type { BaseInfoListResponse } from "@/lib/base-info/browser-types";
import { apiClient, apiErrorMessage } from "@/lib/http/client";

export default function DutyCrewPage() {
  const { data: session, error: sessionError, isLoading: sessionLoading } = useSession();
  const { canManageDutyCrew } = certificateAccess(session);
  const [network, setNetwork] = useState("");
  const [job, setJob] = useState("");
  const [personnel, setPersonnel] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const url = canManageDutyCrew && network ? `/certificate/networks/${network}/duty-crew` : null;
  const { data: crew, error, isLoading, mutate } = useSWR<DutyCrewMember[]>(url);
  const jobs = useSWR<BaseInfoListResponse>(url ? "/base-info/business-types" : null);
  const people = useSWR<BaseInfoListResponse>(url && job
    ? `/base-info/program-makers?networkId=${encodeURIComponent(network)}&jobId=${encodeURIComponent(job)}` : null);

  async function update(personnelId?: number) {
    if (!url || busy) return;
    setBusy(true);
    setMessage("");
    try {
      if (personnelId === undefined) {
        await apiClient.post(url, { jobId: Number(job), personnelId: Number(personnel) });
        setPersonnel("");
      } else {
        await apiClient.delete(`${url}/${personnelId}`);
      }
      await mutate();
    } catch (cause) {
      setMessage(apiErrorMessage(cause, "فهرست عوامل موظفی به‌روز نشد."));
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (job && personnel) void update();
  }

  return <DashboardShell>
    <Breadcrumb items={[{ label: "داشبورد", href: "/dashboard" }, { label: "عوامل موظفی" }]} />
    <div className="page-head"><h1 className="page-title">عوامل موظفی</h1></div>
    {sessionLoading && <p role="status">در حال بررسی دسترسی…</p>}
    {sessionError && <p role="alert">{apiErrorMessage(sessionError, "اطلاعات دسترسی دریافت نشد.")}</p>}
    {session && !canManageDutyCrew && <p role="alert">دسترسی مدیریت عوامل موظفی را ندارید.</p>}
    {session && canManageDutyCrew && <>
      <form className="card" onSubmit={submit}>
        <div className="form-grid">
          <NetworkSelect session={session} value={network} disabled={busy} onChange={(value) => {
            setNetwork(value); setJob(""); setPersonnel(""); setMessage("");
          }} />
          {network && <>
            <label className="field">
              <span className="label">شغل</span>
              <select className="select" required value={job} disabled={busy || jobs.isLoading} onChange={(event) => {
                setJob(event.target.value); setPersonnel("");
              }}>
                <option value="">{jobs.isLoading ? "در حال بارگذاری…" : "انتخاب شغل"}</option>
                {jobs.data?.Data.filter((item) => !item.Disabled).map((item) =>
                  <option key={item.Value} value={item.Value}>{item.Text}</option>)}
              </select>
            </label>
            <label className="field">
              <span className="label">عامل برنامه‌ساز</span>
              <select className="select" required value={personnel} disabled={!job || busy || people.isLoading}
                onChange={(event) => setPersonnel(event.target.value)}>
                <option value="">{people.isLoading ? "در حال بارگذاری…" : people.data?.Data.length === 0 ? "عاملی برای این شغل پیدا نشد" : "انتخاب عامل"}</option>
                {people.data?.Data.filter((item) => !item.Disabled && !crew?.some((member) => member.personnelId === Number(item.Value)))
                  .map((item) => <option key={item.Value} value={item.Value}>{item.Text}</option>)}
              </select>
            </label>
            <div><button className="btn btn-primary" disabled={!personnel || busy}>افزودن عامل موظفی</button></div>
          </>}
        </div>
      </form>
      {(message || error || jobs.error || people.error) && <p className="alert alert-error" role="alert">
        {message || apiErrorMessage(error || jobs.error || people.error, "دریافت اطلاعات عوامل یا مشاغل انجام نشد.")}
      </p>}
      {url && <section className="card">
        <h2>عوامل موظفی شبکه</h2>
        {isLoading && <p role="status">در حال بارگذاری…</p>}
        {crew?.length === 0 && <p>عامل موظفی ثبت نشده است.</p>}
        {Boolean(crew?.length) && <div className="overflow-x-auto"><table className="w-full text-right text-sm [&_td]:p-2 [&_th]:p-2">
          <thead><tr><th>عامل</th><th>شناسه پرسنلی</th><th>عملیات</th></tr></thead>
          <tbody>{crew?.map((member) => <tr key={member.personnelId} className="border-t">
            <td>{member.personnelName}</td><td>{member.personnelId.toLocaleString("fa-IR")}</td>
            <td><button type="button" className="btn btn-outline" disabled={busy} onClick={() => void update(member.personnelId)}
              aria-label={`حذف ${member.personnelName} از عوامل موظفی`}>حذف</button></td>
          </tr>)}</tbody>
        </table></div>}
      </section>}
    </>}
  </DashboardShell>;
}

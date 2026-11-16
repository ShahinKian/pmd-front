"use client";

import { GroupedNumberInput } from "@/components/ui/grouped-number-input";

import { useMemo, useState, type FormEvent } from "react";
import { CircleCheck, Coins, Pencil, Plus, Save, Trash2, Users, X } from "lucide-react";
import useSWR from "swr";
import DashboardShell, { Breadcrumb } from "@/components/layout/dashboard-shell";
import { NetworkSelect } from "@/components/ui/network-field";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useNetworkScope } from "@/hooks/use-network-scope";
import { useSession } from "@/hooks/use-session";
import type { BaseInfoListResponse } from "@/lib/base-info/browser-types";
import { certificateAccess } from "@/lib/certificate/access";
import { displayNumber, parseDeduction } from "@/lib/certificate/format";
import type { DutyCrewMember, Money } from "@/lib/certificate/types";
import { apiClient, apiErrorMessage } from "@/lib/http/client";

export default function DutyCrewPage() {
  const { data: session, error: sessionError, isLoading: sessionLoading } = useSession();
  const { canManageDutyCrew } = certificateAccess(session);
  const [selectedNetwork, setNetwork] = useState("");
  const { networkId: network, loading: networkLoading } = useNetworkScope(session, selectedNetwork);
  const [job, setJob] = useState("");
  const [personnel, setPersonnel] = useState("");
  const [amount, setAmount] = useState("");
  const [editing, setEditing] = useState<{ id: number; value: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const url = canManageDutyCrew && network ? `/certificate/networks/${network}/duty-crew` : null;
  const { data: crew, error, isLoading, mutate } = useSWR<DutyCrewMember[]>(url);
  const jobs = useSWR<BaseInfoListResponse>(url ? "/base-info/business-types" : null);
  const people = useSWR<BaseInfoListResponse>(url && job
    ? `/base-info/program-makers?networkId=${encodeURIComponent(network)}&jobId=${encodeURIComponent(job)}` : null);
  const available = useMemo(() => {
    const registered = new Set(crew?.map((member) => member.personnelId));
    return people.data?.Data.filter((item) => !item.Disabled && !registered.has(Number(item.Value))) ?? [];
  }, [crew, people.data]);

  async function update(operation: (resource: string) => Promise<unknown>, success: string, reset?: () => void) {
    if (!url || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      await operation(url);
      reset?.();
      await mutate();
      setMessage({ text: success });
    } catch (cause) {
      setMessage({ text: apiErrorMessage(cause, "فهرست عوامل موظفی به‌روز نشد."), error: true });
    } finally {
      setBusy(false);
    }
  }

  function validAmount(value: string): Money | null {
    const parsed = parseDeduction(value);
    if (parsed === null) setMessage({ text: "مبلغ موظفی را به‌صورت عدد نامنفی و با حداکثر دو رقم اعشار وارد کنید.", error: true });
    return parsed;
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!job || !personnel) return;
    const defaultDeduction = validAmount(amount);
    if (defaultDeduction === null) return;
    void update((resource) => apiClient.post(resource, { jobId: Number(job), personnelId: Number(personnel), defaultDeduction }),
      "عامل موظفی ثبت شد.", () => { setPersonnel(""); setAmount(""); });
  }

  function saveAmount(event: FormEvent<HTMLFormElement>, member: DutyCrewMember, value: string) {
    event.preventDefault();
    const defaultDeduction = validAmount(value);
    if (defaultDeduction === null) return;
    void update((resource) => apiClient.put(`${resource}/${member.personnelId}/amount`, { defaultDeduction }),
      "مبلغ موظفی به‌روز شد.", () => setEditing(null));
  }

  const lookupError = error || jobs.error || people.error;

  return <DashboardShell>
    <Breadcrumb items={[{ label: "داشبورد", href: "/dashboard" }, { label: "عوامل موظفی" }]} />
    <div className="page-head"><h1 className="page-title">عوامل موظفی</h1></div>
    {sessionLoading && <p role="status">در حال بررسی دسترسی…</p>}
    {sessionError && <p className="alert alert-error" role="alert">{apiErrorMessage(sessionError, "اطلاعات دسترسی دریافت نشد.")}</p>}
    {session && !canManageDutyCrew && <p className="alert alert-error" role="alert">دسترسی مدیریت عوامل موظفی را ندارید.</p>}
    {session && canManageDutyCrew && <div className="space-y-5">
      <form className="form-section" onSubmit={submit}>
        <div className="form-section-head">
          <h2 className="flex items-center gap-2 font-semibold"><Users size={18} className="text-primary" aria-hidden />تعریف عامل موظفی</h2>
        </div>
        <div className="form-section-body">
          <div className="form-grid">
            <NetworkSelect session={session} value={network} loading={networkLoading} disabled={busy} onChange={(value) => {
              setNetwork(value); setJob(""); setPersonnel(""); setAmount(""); setEditing(null); setMessage(null);
            }} />
            {network && <>
              <label className="field">
                <span className="label">شغل</span>
                <SearchableSelect className="select" required value={job} disabled={busy || jobs.isLoading} onChange={(event) => {
                  setJob(event.target.value); setPersonnel("");
                }}>
                  <option value="">{jobs.isLoading ? "در حال بارگذاری…" : "انتخاب شغل"}</option>
                  {jobs.data?.Data.filter((item) => !item.Disabled).map((item) =>
                    <option key={item.Value} value={item.Value}>{item.Text}</option>)}
                </SearchableSelect>
              </label>
              <label className="field">
                <span className="label">عامل برنامه‌ساز</span>
                <SearchableSelect className="select" required value={personnel} disabled={!job || busy || people.isLoading}
                  onChange={(event) => setPersonnel(event.target.value)}>
                  <option value="">{people.isLoading ? "در حال بارگذاری…" : !job ? "ابتدا شغل را انتخاب کنید" :
                    available.length ? "انتخاب عامل" : "عامل قابل انتخابی پیدا نشد"}</option>
                  {available.map((item) => <option key={item.Value} value={item.Value}>{item.Text}</option>)}
                </SearchableSelect>
              </label>
              <label className="field">
                <span className="label flex items-center gap-1.5"><Coins size={15} aria-hidden />مبلغ موظفی</span>
                <GroupedNumberInput decimalPlaces={2} min={0} value={amount}
                  onValueChange={setAmount} disabled={busy} required />
              </label>
            </>}
          </div>
          {network && <div className="mt-5 flex justify-end border-t pt-4">
            <button className="btn btn-success" disabled={!personnel || !amount.trim() || busy}>
              <Plus size={17} aria-hidden />افزودن عامل موظفی
            </button>
          </div>}
        </div>
      </form>
      {message && <p className={message.error ? "alert alert-error" : "alert alert-success flex items-center gap-2"} role={message.error ? "alert" : "status"}>
        {!message.error && <CircleCheck size={16} aria-hidden />}{message.text}
      </p>}
      {lookupError && <p className="alert alert-error" role="alert">{apiErrorMessage(lookupError, "دریافت اطلاعات عوامل یا مشاغل انجام نشد.")}</p>}
      {url && <section className="form-section">
        <div className="form-section-head"><h2 className="font-semibold">عوامل موظفی شبکه</h2>
          {crew && <span className="table-tag">{displayNumber(crew.length)} نفر</span>}
        </div>
        {isLoading && <p className="list-state" role="status">در حال بارگذاری…</p>}
        {crew?.length === 0 && <p className="list-state">عامل موظفی ثبت نشده است.</p>}
        {!!crew?.length && <div className="overflow-x-auto"><table className="w-full text-right text-sm">
          <thead><tr><th scope="col">عامل</th><th scope="col">شناسه پرسنلی</th><th scope="col">مبلغ موظفی</th><th scope="col">عملیات</th></tr></thead>
          <tbody>{crew.map((member) => <tr key={member.personnelId}>
            <td className="font-medium">{member.personnelName}</td>
            <td className="tabular-nums">{displayNumber(member.personnelId)}</td>
            <td className="whitespace-nowrap tabular-nums">{member.defaultDeduction == null ? "تعیین نشده" : displayNumber(member.defaultDeduction)}</td>
            <td>{editing?.id === member.personnelId
              ? <form className="flex flex-wrap items-center gap-2" onSubmit={(event) => saveAmount(event, member, editing.value)}>
                <GroupedNumberInput className="max-w-40" decimalPlaces={2} min={0} aria-label={`مبلغ موظفی ${member.personnelName}`} disabled={busy}
                  value={editing.value} autoFocus required
                  onValueChange={(value) => setEditing({ id: member.personnelId, value })} />
                <button className="btn btn-success" disabled={busy}><Save size={15} aria-hidden />ذخیره</button>
                <button type="button" className="btn btn-outline" disabled={busy} onClick={() => setEditing(null)}><X size={15} aria-hidden />انصراف</button>
              </form>
              : <div className="flex flex-wrap items-center gap-2">
                <button type="button" className="btn btn-info" disabled={busy} onClick={() => {
                  setEditing({ id: member.personnelId, value: member.defaultDeduction ?? "" }); setMessage(null);
                }}><Pencil size={15} aria-hidden />ویرایش مبلغ</button>
                <button type="button" className="btn btn-danger" disabled={busy} onClick={() => {
                  if (window.confirm(`«${member.personnelName}» از فهرست عوامل موظفی حذف شود؟`))
                    void update((resource) => apiClient.delete(`${resource}/${member.personnelId}`), "عامل از فهرست موظفی حذف شد.");
                }} aria-label={`حذف ${member.personnelName} از عوامل موظفی`}><Trash2 size={15} aria-hidden />حذف</button>
              </div>}</td>
          </tr>)}</tbody>
        </table></div>}
      </section>}
    </div>}
  </DashboardShell>;
}

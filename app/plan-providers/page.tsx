"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Link2, Loader2, Save, Trash2, UsersRound } from "lucide-react";
import DashboardShell, { Breadcrumb } from "@/components/layout/dashboard-shell";
import { useSession } from "@/hooks/use-session";
import { apiClient, apiErrorMessage } from "@/lib/http/client";
import type { BaseInfoListResponse } from "@/lib/base-info/browser-types";
import type { PlanProviderLink } from "@/lib/plan-providers/types";

function toPositiveInt(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function PlanProvidersPage() {
  const { data: session, isLoading: sessionLoading } = useSession();
  const roles = session?.user.roles ?? [];
  const canManage = Boolean(
    session?.isSystemAdmin || roles.includes("PlanManager"),
  );

  const { data: networks, isLoading: networksLoading } =
    useSWR<BaseInfoListResponse>(canManage ? "/base-info/networks" : null);

  const [networkId, setNetworkId] = useState<number | null>(null);
  const [planId, setPlanId] = useState<number | null>(null);
  const [selectedProviderIds, setSelectedProviderIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [deletingProviderId, setDeletingProviderId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const plansUrl = networkId ? `/base-info/plans/${networkId}` : null;
  const providersUrl = networkId ? `/base-info/providers/${networkId}` : null;
  const assignmentsUrl = planId ? `/plan-providers/plans/${planId}/providers` : null;

  const { data: plans, isLoading: plansLoading } =
    useSWR<BaseInfoListResponse>(plansUrl);
  const { data: providers, isLoading: providersLoading } =
    useSWR<BaseInfoListResponse>(providersUrl);
  const {
    data: assignments,
    isLoading: assignmentsLoading,
    mutate: mutateAssignments,
  } = useSWR<PlanProviderLink[]>(assignmentsUrl);

  const networkOptions = useMemo(() => {
    const all = (networks?.Data ?? [])
      .map((item) => ({
        id: toPositiveInt(item.Value),
        label: item.Text,
        disabled: item.Disabled,
      }))
      .filter((item): item is { id: number; label: string; disabled: boolean } => item.id !== null);

    if (session?.isSystemAdmin) return all;

    const allowed = new Set(session?.user.networkIds ?? []);
    return all.filter((item) => allowed.has(item.id));
  }, [networks, session]);

  const planOptions = useMemo(
    () =>
      (plans?.Data ?? [])
        .map((item) => ({
          id: toPositiveInt(item.Value),
          label: item.Text,
          disabled: item.Disabled,
        }))
        .filter((item): item is { id: number; label: string; disabled: boolean } => item.id !== null),
    [plans],
  );

  const providerOptions = useMemo(
    () =>
      (providers?.Data ?? [])
        .map((item) => ({
          id: toPositiveInt(item.Value),
          label: item.Text,
          disabled: item.Disabled,
        }))
        .filter((item): item is { id: number; label: string; disabled: boolean } => item.id !== null),
    [providers],
  );

  const assignedIds = useMemo(
    () => new Set((assignments ?? []).map((item) => item.providerId)),
    [assignments],
  );

  function changeNetwork(value: string) {
    setNetworkId(toPositiveInt(value));
    setPlanId(null);
    setSelectedProviderIds([]);
    setMessage(null);
  }

  function changePlan(value: string) {
    setPlanId(toPositiveInt(value));
    setSelectedProviderIds([]);
    setMessage(null);
  }

  function toggleProvider(providerId: number) {
    setSelectedProviderIds((current) =>
      current.includes(providerId)
        ? current.filter((id) => id !== providerId)
        : [...current, providerId],
    );
  }

  async function addProviders() {
    if (!planId || selectedProviderIds.length === 0) {
      setMessage({ type: "error", text: "حداقل یک تهیه‌کننده برای طرح انتخاب کنید." });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      await apiClient.post(`/plan-providers/plans/${planId}/providers`, {
        providerIds: selectedProviderIds,
      });
      setSelectedProviderIds([]);
      await mutateAssignments();
      setMessage({ type: "success", text: "ارتباط تهیه‌کننده‌ها با طرح با موفقیت ثبت شد." });
    } catch (error) {
      setMessage({
        type: "error",
        text: apiErrorMessage(error, "ثبت ارتباط طرح و تهیه‌کننده انجام نشد."),
      });
    } finally {
      setSaving(false);
    }
  }

  async function removeProvider(providerId: number) {
    if (!planId) return;

    setDeletingProviderId(providerId);
    setMessage(null);
    try {
      await apiClient.delete(
        `/plan-providers/plans/${planId}/providers/${providerId}`,
      );
      await mutateAssignments();
      setMessage({ type: "success", text: "ارتباط تهیه‌کننده از طرح حذف شد." });
    } catch (error) {
      setMessage({
        type: "error",
        text: apiErrorMessage(error, "حذف ارتباط انجام نشد."),
      });
    } finally {
      setDeletingProviderId(null);
    }
  }

  return (
    <DashboardShell>
      <Breadcrumb
        items={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "ارتباط طرح و تهیه‌کننده" },
        ]}
      />

      <div className="page-head">
        <div>
          <h1 className="page-title">ارتباط طرح و تهیه‌کننده</h1>
          <p className="page-description">
            تخصیص یک یا چند تهیه‌کننده به طرح‌های برنامه بر اساس شبکه
          </p>
        </div>
      </div>

      {sessionLoading ? <div className="card">در حال بررسی دسترسی...</div> : null}

      {session && !canManage ? (
        <div className="alert alert-error">
          این بخش فقط برای مدیر سیستم و مدیر طرح و برنامه‌ریزی مجاز است.
        </div>
      ) : null}

      {canManage ? (
        <>
          <section className="card" style={{marginBottom:18}}>
            <div className="form-grid">
              <label className="field">
                <span className="label">شبکه *</span>
                <select
                  className="select"
                  value={networkId ?? ""}
                  onChange={(event) => changeNetwork(event.target.value)}
                  disabled={networksLoading}
                >
                  <option value="">
                    {networksLoading ? "در حال دریافت شبکه‌ها..." : "انتخاب شبکه"}
                  </option>
                  {networkOptions.map((network) => (
                    <option
                      key={network.id}
                      value={network.id}
                      disabled={network.disabled}
                    >
                      {network.label}
                    </option>
                  ))}
                </select>
                {!session?.isSystemAdmin ? (
                  <small className="muted">
                    برای مدیر طرح فقط شبکه‌های موجود در دسترسی فعلی کاربر نمایش داده می‌شود.
                  </small>
                ) : null}
              </label>

              <label className="field">
                <span className="label">طرح *</span>
                <select
                  className="select"
                  value={planId ?? ""}
                  onChange={(event) => changePlan(event.target.value)}
                  disabled={!networkId || plansLoading}
                >
                  <option value="">
                    {plansLoading ? "در حال دریافت طرح‌ها..." : "انتخاب طرح"}
                  </option>
                  {planOptions.map((plan) => (
                    <option key={plan.id} value={plan.id} disabled={plan.disabled}>
                      {plan.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {planId ? (
            <div className="grid grid-2">
              <section className="card">
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
                  <div className="stat-icon"><UsersRound size={20}/></div>
                  <div>
                    <strong>افزودن تهیه‌کننده</strong>
                    <div className="muted" style={{fontSize:12,marginTop:3}}>
                      تهیه‌کننده‌های همان شبکه نمایش داده می‌شوند.
                    </div>
                  </div>
                </div>

                {providersLoading ? (
                  <div className="muted">در حال دریافت تهیه‌کننده‌ها...</div>
                ) : null}

                <div className="checkbox-row">
                  {providerOptions.map((provider) => {
                    const alreadyAssigned = assignedIds.has(provider.id);
                    return (
                      <label className="check-card" key={provider.id}>
                        <input
                          type="checkbox"
                          disabled={provider.disabled || alreadyAssigned}
                          checked={
                            alreadyAssigned || selectedProviderIds.includes(provider.id)
                          }
                          onChange={() => toggleProvider(provider.id)}
                        />
                        <span>{provider.label}</span>
                        {alreadyAssigned ? (
                          <small className="muted">ثبت‌شده</small>
                        ) : null}
                      </label>
                    );
                  })}
                </div>

                {providerOptions.length === 0 && !providersLoading ? (
                  <div className="muted" style={{padding:"12px 0"}}>
                    تهیه‌کننده‌ای برای این شبکه دریافت نشد.
                  </div>
                ) : null}

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{marginTop:18}}
                  onClick={addProviders}
                  disabled={saving || selectedProviderIds.length === 0}
                >
                  {saving ? <Loader2 size={17}/> : <Save size={17}/>}
                  {saving ? "در حال ثبت..." : `ثبت ${selectedProviderIds.length || ""} تهیه‌کننده`}
                </button>
              </section>

              <section className="card">
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
                  <div className="stat-icon"><Link2 size={20}/></div>
                  <div>
                    <strong>تهیه‌کننده‌های فعلی طرح</strong>
                    <div className="muted" style={{fontSize:12,marginTop:3}}>
                      ارتباط‌های ثبت‌شده در PlanProvider
                    </div>
                  </div>
                </div>

                {assignmentsLoading ? (
                  <div className="muted">در حال دریافت ارتباط‌های فعلی...</div>
                ) : null}

                {(assignments ?? []).map((assignment) => {
                  const provider = providerOptions.find(
                    (item) => item.id === assignment.providerId,
                  );
                  return (
                    <div
                      key={assignment.providerId}
                      style={{
                        display:"flex",
                        alignItems:"center",
                        justifyContent:"space-between",
                        gap:12,
                        padding:"11px 0",
                        borderBottom:"1px solid var(--border)",
                      }}
                    >
                      <div>
                        <div style={{fontWeight:700}}>
                          {provider?.label ?? `تهیه‌کننده شماره ${assignment.providerId}`}
                        </div>
                        <div className="muted" style={{fontSize:11,marginTop:4}}>
                          ProviderId: {assignment.providerId}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => removeProvider(assignment.providerId)}
                        disabled={deletingProviderId === assignment.providerId}
                        aria-label="حذف ارتباط"
                      >
                        {deletingProviderId === assignment.providerId
                          ? <Loader2 size={16}/>
                          : <Trash2 size={16}/>}
                        حذف
                      </button>
                    </div>
                  );
                })}

                {assignments?.length === 0 && !assignmentsLoading ? (
                  <div className="muted" style={{textAlign:"center",padding:28}}>
                    هنوز تهیه‌کننده‌ای به این طرح متصل نشده است.
                  </div>
                ) : null}
              </section>
            </div>
          ) : (
            <section className="card" style={{textAlign:"center",padding:32}}>
              ابتدا شبکه و سپس طرح را انتخاب کنید.
            </section>
          )}

          {message ? (
            <div
              className={`alert ${message.type === "error" ? "alert-error" : "alert-success"}`}
              style={{marginTop:18}}
            >
              {message.text}
            </div>
          ) : null}
        </>
      ) : null}
    </DashboardShell>
  );
}

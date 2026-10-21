"use client";

import { FormEvent, useMemo, useState } from "react";
import useSWR from "swr";
import { KeyRound, Loader2, Save, Search, ShieldAlert, UserCog } from "lucide-react";
import DashboardShell, { Breadcrumb } from "@/components/layout/dashboard-shell";
import { useSession } from "@/hooks/use-session";
import { apiClient, apiErrorMessage } from "@/lib/http/client";
import type { BaseInfoListResponse } from "@/lib/base-info/browser-types";
import { roleLabel } from "@/lib/auth/roles";
import { Switch } from "@/components/ui/switch";

interface UserRolesResponse {
  userId: string;
  roles: Array<{ id: string; name: string }>;
  selectedRoleIds: string[];
}

function isGuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function toPositiveInt(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function ManageUserPage() {
  const { data: session } = useSession();
  const [inputUserId, setInputUserId] = useState("");
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [providerNetworkId, setProviderNetworkId] = useState<number | null>(null);
  const [providerId, setProviderId] = useState<number | null>(null);
  const [savingRoles, setSavingRoles] = useState(false);
  const [savingProvider, setSavingProvider] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const { data: roleData, error: roleError, isLoading: rolesLoading } =
    useSWR<UserRolesResponse>(loadedUserId ? `/auth/users/${loadedUserId}/roles` : null, {
      onSuccess(data) {
        setSelectedRoleIds(data.selectedRoleIds);
      },
    });

  const { data: networks } = useSWR<BaseInfoListResponse>("/base-info/networks");
  const providerUrl = providerNetworkId ? `/base-info/providers/${providerNetworkId}` : null;
  const { data: providers, isLoading: providersLoading } =
    useSWR<BaseInfoListResponse>(providerUrl);

  const providerRole = useMemo(
    () => roleData?.roles.find((role) => role.name === "Providers"),
    [roleData],
  );
  const providerRoleSelected = Boolean(
    providerRole && selectedRoleIds.includes(providerRole.id),
  );

  function loadUser(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    const normalized = inputUserId.trim();
    if (!isGuid(normalized)) {
      setMessage({ type: "error", text: "شناسه Guid کاربر معتبر نیست." });
      return;
    }
    setLoadedUserId(normalized);
    setProviderNetworkId(null);
    setProviderId(null);
  }

  function toggleRole(roleId: string) {
    setSelectedRoleIds((current) =>
      current.includes(roleId)
        ? current.filter((id) => id !== roleId)
        : [...current, roleId],
    );
  }

  async function saveRoles() {
    if (!loadedUserId || !roleData) return;

    if (providerRoleSelected && !providerId) {
      setMessage({
        type: "error",
        text: "برای افزودن یا حفظ نقش تهیه‌کننده، ابتدا providerId معتبر را از لیست تهیه‌کنندگان انتخاب کنید.",
      });
      return;
    }

    setSavingRoles(true);
    setMessage(null);
    try {
      await apiClient.put(`/auth/users/${loadedUserId}/roles`, {
        userId: loadedUserId,
        roleIds: selectedRoleIds,
        ...(providerRoleSelected ? { providerId } : {}),
      });
      setMessage({ type: "success", text: "نقش‌های کاربر با موفقیت به‌روزرسانی شد." });
    } catch (error) {
      setMessage({ type: "error", text: apiErrorMessage(error, "به‌روزرسانی نقش‌ها انجام نشد.") });
    } finally {
      setSavingRoles(false);
    }
  }

  async function saveProvider() {
    if (!loadedUserId || !providerId) {
      setMessage({ type: "error", text: "ابتدا تهیه‌کننده را انتخاب کنید." });
      return;
    }

    setSavingProvider(true);
    setMessage(null);
    try {
      await apiClient.put(`/auth/users/${loadedUserId}/provider`, { providerId });
      setMessage({ type: "success", text: "شناسه تهیه‌کننده کاربر با موفقیت به‌روزرسانی شد." });
    } catch (error) {
      setMessage({ type: "error", text: apiErrorMessage(error, "به‌روزرسانی providerId انجام نشد.") });
    } finally {
      setSavingProvider(false);
    }
  }

  return (
    <DashboardShell>
      <Breadcrumb
        items={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "مدیریت کاربران", href: "/users" },
          { label: "ویرایش دسترسی کاربر" },
        ]}
      />

      <div className="page-head">
        <div>
          <h1 className="page-title">ویرایش دسترسی کاربر</h1>
          <p className="page-description">
            مدیریت نقش‌ها و providerId کاربر موجود بر اساس endpointهای واقعی pmd-api
          </p>
        </div>
      </div>

      {session && !session.isSystemAdmin ? (
        <div className="alert alert-error">
          <ShieldAlert size={16} style={{verticalAlign:"middle",marginLeft:6}}/>
          این صفحه فقط برای مدیر سیستم مجاز است.
        </div>
      ) : null}

      {session?.isSystemAdmin ? (
        <>
          <section className="card" style={{marginBottom:18}}>
            <form onSubmit={loadUser} className="form-grid">
              <label className="field full">
                <span className="label">شناسه کاربر (GUID)</span>
                <div style={{display:"flex",gap:8}}>
                  <input
                    className="input"
                    style={{flex:1}}
                    dir="ltr"
                    value={inputUserId}
                    onChange={(e) => setInputUserId(e.target.value)}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  />
                  <button className="btn btn-primary" type="submit">
                    <Search size={17}/>بارگذاری
                  </button>
                </div>
                <small className="muted">
                  تا زمانی که بک‌اند endpoint فهرست کاربران ارائه نکند، کاربر موجود با شناسه داخلی انتخاب می‌شود.
                </small>
              </label>
            </form>
          </section>

          {rolesLoading ? <div className="card">در حال دریافت نقش‌های کاربر...</div> : null}
          {roleError ? <div className="alert alert-error">دریافت نقش‌های کاربر انجام نشد.</div> : null}

          {roleData ? (
            <div className="grid grid-2">
              <section className="card">
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
                  <div className="stat-icon"><UserCog size={20}/></div>
                  <strong>نقش‌های کاربر</strong>
                </div>

                <div className="role-grid">
                  {roleData.roles.map((role) => {
                    const active = selectedRoleIds.includes(role.id);
                    return (
                      <div className={`role-card ${active ? "active" : ""}`} key={role.id}>
                        <div className="role-title">
                          <strong>{roleLabel(role.name)}</strong>
                          <small>{role.name}</small>
                        </div>
                        <Switch
                          checked={active}
                          onCheckedChange={(checked) =>
                            setSelectedRoleIds((current) =>
                              checked
                                ? Array.from(new Set([...current, role.id]))
                                : current.filter((id) => id !== role.id),
                            )
                          }
                        />
                      </div>
                    );
                  })}
                </div>

                {selectedRoleIds.some((id) => roleData.roles.find((r) => r.id === id)?.name === "Admin") ? (
                  <div className="alert" style={{marginTop:14,background:"#fff7ed",border:"1px solid #fed7aa",color:"#9a3412"}}>
                    نقش مدیر سیستم دسترسی سراسری سامانه ثبت عملکرد دارد.
                  </div>
                ) : null}

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{marginTop:18}}
                  onClick={saveRoles}
                  disabled={savingRoles}
                >
                  {savingRoles ? <Loader2 size={17}/> : <Save size={17}/>}
                  ذخیره نقش‌ها
                </button>
              </section>

              <section className="card">
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
                  <div className="stat-icon"><KeyRound size={20}/></div>
                  <strong>شناسه تهیه‌کننده</strong>
                </div>

                <label className="field">
                  <span className="label">شبکه برای فیلتر تهیه‌کنندگان</span>
                  <select
                    className="select"
                    value={providerNetworkId ?? ""}
                    onChange={(e) => {
                      setProviderNetworkId(toPositiveInt(e.target.value));
                      setProviderId(null);
                    }}
                  >
                    <option value="">انتخاب شبکه</option>
                    {(networks?.Data ?? []).map((network) => {
                      const id = toPositiveInt(network.Value);
                      return id ? <option key={id} value={id}>{network.Text}</option> : null;
                    })}
                  </select>
                  <small className="muted">
                    این انتخاب فقط برای یافتن پرسنل تهیه‌کننده است و network assignment کاربر را تغییر نمی‌دهد.
                  </small>
                </label>

                <label className="field" style={{marginTop:14}}>
                  <span className="label">تهیه‌کننده</span>
                  <select
                    className="select"
                    value={providerId ?? ""}
                    onChange={(e) => setProviderId(toPositiveInt(e.target.value))}
                    disabled={!providerNetworkId || providersLoading}
                  >
                    <option value="">
                      {providersLoading ? "در حال دریافت..." : "انتخاب تهیه‌کننده"}
                    </option>
                    {(providers?.Data ?? []).map((provider) => {
                      const id = toPositiveInt(provider.Value);
                      return id ? <option key={id} value={id}>{provider.Text}</option> : null;
                    })}
                  </select>
                </label>

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{marginTop:18}}
                  onClick={saveProvider}
                  disabled={savingProvider || !providerId}
                >
                  {savingProvider ? <Loader2 size={17}/> : <Save size={17}/>}
                  ذخیره providerId
                </button>
              </section>
            </div>
          ) : null}

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

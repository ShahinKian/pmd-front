"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Loader2, Save, ShieldAlert, UserPlus } from "lucide-react";
import DashboardShell, { Breadcrumb } from "@/components/layout/dashboard-shell";
import { useSession } from "@/hooks/use-session";
import { apiClient, apiErrorMessage } from "@/lib/http/client";
import type { RoleResponse } from "@/lib/auth/types";
import type { BaseInfoListResponse } from "@/lib/base-info/browser-types";
import { roleLabel } from "@/lib/auth/roles";

const PROVIDERS_ROLE = "Providers";

function toPositiveInt(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function NewUserPage() {
  const router = useRouter();
  const { data: session, isLoading: sessionLoading } = useSession();
  const { data: roles, isLoading: rolesLoading } = useSWR<RoleResponse[]>("/auth/roles");
  const { data: networks, isLoading: networksLoading } =
    useSWR<BaseInfoListResponse>("/base-info/networks");

  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedNetworkIds, setSelectedNetworkIds] = useState<number[]>([]);
  const [groupNetworkId, setGroupNetworkId] = useState<number | null>(null);
  const [networkGroupId, setNetworkGroupId] = useState<number | null>(null);
  const [providerNetworkId, setProviderNetworkId] = useState<number | null>(null);
  const [providerId, setProviderId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const isProvider = selectedRoles.includes(PROVIDERS_ROLE);

  const groupsUrl = groupNetworkId ? `/base-info/network-groups/${groupNetworkId}` : null;
  const { data: groups, isLoading: groupsLoading } =
    useSWR<BaseInfoListResponse>(groupsUrl);

  const providerUrl =
    isProvider && providerNetworkId
      ? `/base-info/providers/${providerNetworkId}`
      : null;
  const { data: providers, isLoading: providersLoading } =
    useSWR<BaseInfoListResponse>(providerUrl);

  const networkOptions = useMemo(
    () =>
      (networks?.Data ?? [])
        .map((item) => ({ id: toPositiveInt(item.Value), label: item.Text, disabled: item.Disabled }))
        .filter((item): item is { id: number; label: string; disabled: boolean } => item.id !== null),
    [networks],
  );

  function toggleRole(role: string) {
    setSelectedRoles((current) => {
      const exists = current.includes(role);
      const next = exists ? current.filter((item) => item !== role) : [...current, role];

      if (role === PROVIDERS_ROLE && exists) {
        setProviderId(null);
        setProviderNetworkId(null);
      }

      return next;
    });
  }

  function toggleNetwork(networkId: number) {
    setSelectedNetworkIds((current) => {
      const exists = current.includes(networkId);
      const next = exists ? current.filter((id) => id !== networkId) : [...current, networkId];

      if (exists && providerNetworkId === networkId) {
        setProviderNetworkId(null);
        setProviderId(null);
      }
      if (exists && groupNetworkId === networkId) {
        setGroupNetworkId(null);
        setNetworkGroupId(null);
      }

      return next;
    });
  }

  function changeProviderNetwork(value: string) {
    setProviderNetworkId(toPositiveInt(value));
    setProviderId(null);
  }

  function changeGroupNetwork(value: string) {
    setGroupNetworkId(toPositiveInt(value));
    setNetworkGroupId(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!session?.isSystemAdmin) {
      setMessage({ type: "error", text: "فقط مدیر سیستم مجاز به تعریف کاربر است." });
      return;
    }

    if (selectedRoles.length === 0) {
      setMessage({ type: "error", text: "حداقل یک نقش برای کاربر انتخاب کنید." });
      return;
    }

    if (isProvider && (!providerNetworkId || !providerId)) {
      setMessage({
        type: "error",
        text: "برای نقش تهیه‌کننده، شبکه مبنا و تهیه‌کننده همان شبکه الزامی است.",
      });
      return;
    }

    const form = new FormData(event.currentTarget);
    setSaving(true);

    try {
      const response = await apiClient.post("/auth/register", {
        fullName: String(form.get("fullName") ?? "").trim(),
        userName: String(form.get("userName") ?? "").trim(),
        password: String(form.get("password") ?? ""),
        roles: selectedRoles,
        networkIds: selectedNetworkIds,
        networkGroupId,
        providerId: isProvider ? providerId : null,
      });

      const createdName = response.data?.userName ?? String(form.get("userName") ?? "");
      setMessage({ type: "success", text: `کاربر «${createdName}» با موفقیت ایجاد شد.` });
      event.currentTarget.reset();
      setSelectedRoles([]);
      setSelectedNetworkIds([]);
      setGroupNetworkId(null);
      setNetworkGroupId(null);
      setProviderNetworkId(null);
      setProviderId(null);
    } catch (error) {
      setMessage({ type: "error", text: apiErrorMessage(error, "ثبت کاربر انجام نشد.") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell>
      <Breadcrumb
        items={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "مدیریت کاربران", href: "/users" },
          { label: "تعریف کاربر" },
        ]}
      />

      <div className="page-head">
        <div>
          <h1 className="page-title">تعریف کاربر جدید</h1>
          <p className="page-description">
            ایجاد کاربر، تخصیص نقش، شبکه، گروه برنامه‌ساز و شناسه تهیه‌کننده
          </p>
        </div>
      </div>

      {sessionLoading ? <div className="card">در حال بررسی دسترسی...</div> : null}

      {session && !session.isSystemAdmin ? (
        <div className="alert alert-error">
          <ShieldAlert size={16} style={{verticalAlign:"middle",marginLeft:6}}/>
          دسترسی به این صفحه فقط برای مدیر سیستم مجاز است.
        </div>
      ) : null}

      {session?.isSystemAdmin ? (
        <form onSubmit={submit} className="card">
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
            <div className="stat-icon"><UserPlus size={20}/></div>
            <div>
              <strong>اطلاعات حساب</strong>
              <div className="muted" style={{fontSize:12,marginTop:3}}>فیلدها مطابق قرارداد واقعی pmd-api ارسال می‌شوند.</div>
            </div>
          </div>

          <div className="form-grid">
            <label className="field">
              <span className="label">نام و نام خانوادگی *</span>
              <input className="input" name="fullName" required />
            </label>

            <label className="field">
              <span className="label">نام کاربری *</span>
              <input className="input" name="userName" dir="ltr" autoComplete="off" required />
            </label>

            <label className="field">
              <span className="label">رمز عبور *</span>
              <input className="input" name="password" type="password" dir="ltr" minLength={8} autoComplete="new-password" required />
              <small className="muted">حداقل ۸ کاراکتر</small>
            </label>

            <div className="field full">
              <span className="label">نقش‌ها *</span>
              {rolesLoading ? <span className="muted">در حال دریافت نقش‌ها...</span> : null}
              <div className="checkbox-row">
                {(roles ?? []).map((role) => (
                  <label className="check-card" key={role.id}>
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(role.name)}
                      onChange={() => toggleRole(role.name)}
                    />
                    <span>{roleLabel(role.name)}</span>
                    <small className="muted">({role.name})</small>
                  </label>
                ))}
              </div>
              {selectedRoles.includes("Admin") ? (
                <div className="alert" style={{background:"#fff7ed",border:"1px solid #fed7aa",color:"#9a3412"}}>
                  نقش «مدیر سیستم» دسترسی سراسری دارد؛ فقط برای مدیران کل سامانه ثبت عملکرد استفاده شود.
                </div>
              ) : null}
            </div>

            <div className="field full">
              <span className="label">شبکه‌های کاربر</span>
              {networksLoading ? <span className="muted">در حال دریافت شبکه‌ها...</span> : null}
              <div className="checkbox-row">
                {networkOptions.map((network) => (
                  <label className="check-card" key={network.id}>
                    <input
                      type="checkbox"
                      disabled={network.disabled}
                      checked={selectedNetworkIds.includes(network.id)}
                      onChange={() => toggleNetwork(network.id)}
                    />
                    <span>{network.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <label className="field">
              <span className="label">شبکه گروه برنامه‌ساز</span>
              <select className="select" value={groupNetworkId ?? ""} onChange={(e) => changeGroupNetwork(e.target.value)}>
                <option value="">بدون گروه</option>
                {networkOptions
                  .filter((network) => selectedNetworkIds.includes(network.id))
                  .map((network) => (
                    <option key={network.id} value={network.id}>{network.label}</option>
                  ))}
              </select>
              <small className="muted">ابتدا شبکه‌ای از شبکه‌های همین کاربر را انتخاب کنید.</small>
            </label>

            <label className="field">
              <span className="label">گروه برنامه‌ساز</span>
              <select
                className="select"
                value={networkGroupId ?? ""}
                onChange={(e) => setNetworkGroupId(toPositiveInt(e.target.value))}
                disabled={!groupNetworkId || groupsLoading}
              >
                <option value="">{groupsLoading ? "در حال دریافت گروه‌ها..." : "بدون گروه / انتخاب کنید"}</option>
                {(groups?.Data ?? []).map((group) => {
                  const id = toPositiveInt(group.Value);
                  return id ? <option key={id} value={id} disabled={group.Disabled}>{group.Text}</option> : null;
                })}
              </select>
            </label>

            {isProvider ? (
              <>
                <label className="field">
                  <span className="label">شبکه مبنای تهیه‌کننده *</span>
                  <select
                    className="select"
                    value={providerNetworkId ?? ""}
                    onChange={(event) => changeProviderNetwork(event.target.value)}
                    required
                  >
                    <option value="">انتخاب کنید</option>
                    {networkOptions
                      .filter((network) => selectedNetworkIds.includes(network.id))
                      .map((network) => (
                        <option key={network.id} value={network.id}>{network.label}</option>
                      ))}
                  </select>
                  <small className="muted">فقط از بین شبکه‌های انتخاب‌شده کاربر.</small>
                </label>

                <label className="field">
                  <span className="label">تهیه‌کننده *</span>
                  <select
                    className="select"
                    value={providerId ?? ""}
                    onChange={(event) => setProviderId(toPositiveInt(event.target.value))}
                    disabled={!providerNetworkId || providersLoading}
                    required
                  >
                    <option value="">
                      {providersLoading ? "در حال دریافت تهیه‌کنندگان..." : "انتخاب تهیه‌کننده"}
                    </option>
                    {(providers?.Data ?? []).map((provider) => {
                      const id = toPositiveInt(provider.Value);
                      return id ? (
                        <option key={id} value={id} disabled={provider.Disabled}>{provider.Text}</option>
                      ) : null;
                    })}
                  </select>
                  <small className="muted">Value پرسنل به‌عنوان providerId ذخیره می‌شود.</small>
                </label>
              </>
            ) : null}
          </div>

          {message ? (
            <div className={`alert ${message.type === "error" ? "alert-error" : "alert-success"}`} style={{marginTop:18}}>
              {message.text}
            </div>
          ) : null}

          <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:20}}>
            <button type="button" className="btn btn-outline" onClick={() => router.push("/users")}>انصراف</button>
            <button type="submit" className="btn btn-primary" disabled={saving || rolesLoading || networksLoading}>
              {saving ? <Loader2 size={17}/> : <Save size={17}/>}
              {saving ? "در حال ثبت..." : "ثبت کاربر"}
            </button>
          </div>
        </form>
      ) : null}
    </DashboardShell>
  );
}

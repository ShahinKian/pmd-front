"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Loader2, Save, ShieldAlert, UserPlus, UsersRound } from "lucide-react";
import DashboardShell, { Breadcrumb } from "@/components/layout/dashboard-shell";
import { useSession } from "@/hooks/use-session";
import { apiClient, apiErrorMessage } from "@/lib/http/client";
import type { RoleResponse } from "@/lib/auth/types";
import type { BaseInfoListResponse } from "@/lib/base-info/browser-types";
import { roleLabel } from "@/lib/auth/roles";
import { Switch } from "@/components/ui/switch";

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
  const [providerLookupNetworkId, setProviderLookupNetworkId] = useState<number | null>(null);
  const [providerId, setProviderId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const isProvider = selectedRoles.includes(PROVIDERS_ROLE);

  const groupsUrl =
    !isProvider && groupNetworkId
      ? `/base-info/network-groups/${groupNetworkId}`
      : null;
  const { data: groups, isLoading: groupsLoading } =
    useSWR<BaseInfoListResponse>(groupsUrl);

  const providerUrl =
    isProvider && providerLookupNetworkId
      ? `/base-info/providers/${providerLookupNetworkId}`
      : null;
  const { data: providers, isLoading: providersLoading } =
    useSWR<BaseInfoListResponse>(providerUrl);

  const networkOptions = useMemo(
    () =>
      (networks?.Data ?? [])
        .map((item) => ({
          id: toPositiveInt(item.Value),
          label: item.Text,
          disabled: item.Disabled,
        }))
        .filter(
          (item): item is { id: number; label: string; disabled: boolean } =>
            item.id !== null,
        ),
    [networks],
  );

  function setRole(role: string, checked: boolean) {
    setSelectedRoles((current) => {
      const next = checked
        ? Array.from(new Set([...current, role]))
        : current.filter((item) => item !== role);

      if (role === PROVIDERS_ROLE) {
        setSelectedNetworkIds([]);
        setGroupNetworkId(null);
        setNetworkGroupId(null);
        setProviderLookupNetworkId(null);
        setProviderId(null);
      }
      return next;
    });
  }

  function setNetwork(networkId: number, checked: boolean) {
    setSelectedNetworkIds((current) => {
      const next = checked
        ? Array.from(new Set([...current, networkId]))
        : current.filter((id) => id !== networkId);

      if (!checked && groupNetworkId === networkId) {
        setGroupNetworkId(null);
        setNetworkGroupId(null);
      }
      return next;
    });
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

    if (isProvider && !providerId) {
      setMessage({
        type: "error",
        text: "برای نقش تهیه‌کننده، انتخاب پرسنل تهیه‌کننده الزامی است.",
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
        networkIds: isProvider ? [] : selectedNetworkIds,
        networkGroupId: isProvider ? null : networkGroupId,
        providerId: isProvider ? providerId : null,
      });

      const createdName =
        response.data?.userName ?? String(form.get("userName") ?? "");
      setMessage({
        type: "success",
        text: `کاربر «${createdName}» با موفقیت ایجاد شد.`,
      });

      event.currentTarget.reset();
      setSelectedRoles([]);
      setSelectedNetworkIds([]);
      setGroupNetworkId(null);
      setNetworkGroupId(null);
      setProviderLookupNetworkId(null);
      setProviderId(null);
    } catch (error) {
      setMessage({
        type: "error",
        text: apiErrorMessage(error, "ثبت کاربر انجام نشد."),
      });
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
            اطلاعات حساب، نقش‌ها و دسترسی‌های سازمانی کاربر را تعریف کنید.
          </p>
        </div>
      </div>

      {sessionLoading ? <div className="card">در حال بررسی دسترسی...</div> : null}

      {session && !session.isSystemAdmin ? (
        <div className="alert alert-error">
          <ShieldAlert size={16} style={{ verticalAlign: "middle", marginLeft: 6 }} />
          دسترسی به این صفحه فقط برای مدیر سیستم مجاز است.
        </div>
      ) : null}

      {session?.isSystemAdmin ? (
        <form onSubmit={submit} className="grid" style={{ gap: 18 }}>
          <section className="form-section">
            <div className="form-section-head">
              <div>
                <strong>اطلاعات حساب</strong>
                <div className="section-kicker">مشخصات اصلی ورود به سامانه</div>
              </div>
              <div className="stat-icon"><UserPlus size={20} /></div>
            </div>
            <div className="form-section-body">
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
                  <input
                    className="input"
                    name="password"
                    type="password"
                    dir="ltr"
                    minLength={8}
                    autoComplete="new-password"
                    required
                  />
                  <small className="muted">حداقل ۸ کاراکتر</small>
                </label>
              </div>
            </div>
          </section>

          <section className="form-section">
            <div className="form-section-head">
              <div>
                <strong>نقش‌های کاربر</strong>
                <div className="section-kicker">همه انتخاب‌ها به‌صورت Switch هستند.</div>
              </div>
              <div className="stat-icon"><UsersRound size={20} /></div>
            </div>
            <div className="form-section-body">
              {rolesLoading ? <div className="muted">در حال دریافت نقش‌ها...</div> : null}
              <div className="role-grid">
                {(roles ?? []).map((role) => {
                  const active = selectedRoles.includes(role.name);
                  return (
                    <div className={`role-card ${active ? "active" : ""}`} key={role.id}>
                      <div className="role-title">
                        <strong>{roleLabel(role.name)}</strong>
                        <small>{role.name}</small>
                      </div>
                      <Switch
                        checked={active}
                        onCheckedChange={(checked) => setRole(role.name, checked)}
                      />
                    </div>
                  );
                })}
              </div>

              {selectedRoles.includes("Admin") ? (
                <div
                  className="alert"
                  style={{
                    marginTop: 14,
                    background: "#fff7ed",
                    border: "1px solid #fed7aa",
                    color: "#9a3412",
                  }}
                >
                  نقش «مدیر سیستم» دسترسی سراسری سامانه ثبت عملکرد دارد.
                </div>
              ) : null}
            </div>
          </section>

          {isProvider ? (
            <section className="form-section">
              <div className="form-section-head">
                <div>
                  <strong>اتصال کاربر به تهیه‌کننده</strong>
                  <div className="section-kicker">
                    برای تهیه‌کننده networkIds و networkGroupId ذخیره نمی‌شود؛ دسترسی طرح‌ها از PlanProvider تعیین می‌شود.
                  </div>
                </div>
              </div>
              <div className="form-section-body">
                <div className="form-grid">
                  <label className="field">
                    <span className="label">شبکه جستجوی تهیه‌کننده *</span>
                    <select
                      className="select"
                      value={providerLookupNetworkId ?? ""}
                      onChange={(e) => {
                        setProviderLookupNetworkId(toPositiveInt(e.target.value));
                        setProviderId(null);
                      }}
                      required
                    >
                      <option value="">انتخاب شبکه برای جستجو</option>
                      {networkOptions.map((network) => (
                        <option key={network.id} value={network.id} disabled={network.disabled}>
                          {network.label}
                        </option>
                      ))}
                    </select>
                    <small className="muted">
                      این شبکه فقط برای یافتن پرسنل است و به‌عنوان دسترسی کاربر ذخیره نمی‌شود.
                    </small>
                  </label>

                  <label className="field">
                    <span className="label">تهیه‌کننده *</span>
                    <select
                      className="select"
                      value={providerId ?? ""}
                      onChange={(e) => setProviderId(toPositiveInt(e.target.value))}
                      disabled={!providerLookupNetworkId || providersLoading}
                      required
                    >
                      <option value="">
                        {providersLoading
                          ? "در حال دریافت تهیه‌کنندگان..."
                          : "انتخاب تهیه‌کننده"}
                      </option>
                      {(providers?.Data ?? []).map((provider) => {
                        const id = toPositiveInt(provider.Value);
                        return id ? (
                          <option key={id} value={id} disabled={provider.Disabled}>
                            {provider.Text}
                          </option>
                        ) : null;
                      })}
                    </select>
                    <small className="muted">
                      Value پرسنل به‌عنوان providerId روی کاربر ذخیره می‌شود.
                    </small>
                  </label>
                </div>
              </div>
            </section>
          ) : (
            <section className="form-section">
              <div className="form-section-head">
                <div>
                  <strong>دسترسی سازمانی</strong>
                  <div className="section-kicker">
                    شبکه‌ها و در صورت نیاز گروه برنامه‌ساز را تعیین کنید.
                  </div>
                </div>
              </div>
              <div className="form-section-body">
                {networksLoading ? <div className="muted">در حال دریافت شبکه‌ها...</div> : null}
                <div className="role-grid">
                  {networkOptions.map((network) => {
                    const active = selectedNetworkIds.includes(network.id);
                    return (
                      <div className={`role-card ${active ? "active" : ""}`} key={network.id}>
                        <div className="role-title">
                          <strong>{network.label}</strong>
                          <small>NetworkId: {network.id}</small>
                        </div>
                        <Switch
                          checked={active}
                          disabled={network.disabled}
                          onCheckedChange={(checked) => setNetwork(network.id, checked)}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="form-grid" style={{ marginTop: 16 }}>
                  <label className="field">
                    <span className="label">شبکه گروه برنامه‌ساز</span>
                    <select
                      className="select"
                      value={groupNetworkId ?? ""}
                      onChange={(e) => {
                        setGroupNetworkId(toPositiveInt(e.target.value));
                        setNetworkGroupId(null);
                      }}
                    >
                      <option value="">بدون گروه</option>
                      {networkOptions
                        .filter((network) => selectedNetworkIds.includes(network.id))
                        .map((network) => (
                          <option key={network.id} value={network.id}>
                            {network.label}
                          </option>
                        ))}
                    </select>
                  </label>

                  <label className="field">
                    <span className="label">گروه برنامه‌ساز</span>
                    <select
                      className="select"
                      value={networkGroupId ?? ""}
                      onChange={(e) => setNetworkGroupId(toPositiveInt(e.target.value))}
                      disabled={!groupNetworkId || groupsLoading}
                    >
                      <option value="">
                        {groupsLoading ? "در حال دریافت گروه‌ها..." : "بدون گروه / انتخاب کنید"}
                      </option>
                      {(groups?.Data ?? []).map((group) => {
                        const id = toPositiveInt(group.Value);
                        return id ? (
                          <option key={id} value={id} disabled={group.Disabled}>
                            {group.Text}
                          </option>
                        ) : null;
                      })}
                    </select>
                  </label>
                </div>
              </div>
            </section>
          )}

          {message ? (
            <div className={`alert ${message.type === "error" ? "alert-error" : "alert-success"}`}>
              {message.text}
            </div>
          ) : null}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" className="btn btn-outline" onClick={() => router.push("/users")}>
              انصراف
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || rolesLoading || networksLoading}
            >
              {saving ? <Loader2 size={17} /> : <Save size={17} />}
              {saving ? "در حال ثبت..." : "ثبت کاربر"}
            </button>
          </div>
        </form>
      ) : null}
    </DashboardShell>
  );
}

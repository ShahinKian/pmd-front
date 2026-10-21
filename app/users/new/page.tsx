"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Camera, Loader2, Save, ShieldAlert, UserPlus, UsersRound } from "lucide-react";
import DashboardShell, { Breadcrumb } from "@/components/layout/dashboard-shell";
import { useSession } from "@/hooks/use-session";
import { apiClient, apiErrorMessage } from "@/lib/http/client";
import type { RoleResponse } from "@/lib/auth/types";
import type { BaseInfoListResponse } from "@/lib/base-info/browser-types";
import { roleLabel } from "@/lib/auth/roles";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PROVIDERS_ROLE = "Providers";
const NETWORK_GROUP_MANAGER_ROLE = "NetworkGroupManager";

function toPositiveInt(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function NewUserPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: session, isLoading: sessionLoading } = useSession();

  const { data: roles, isLoading: rolesLoading } =
    useSWR<RoleResponse[]>("/auth/roles");
  const { data: networks, isLoading: networksLoading } =
    useSWR<BaseInfoListResponse>("/base-info/networks");

  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedNetworkIds, setSelectedNetworkIds] = useState<number[]>([]);
  const [groupNetworkId, setGroupNetworkId] = useState<number | null>(null);
  const [networkGroupId, setNetworkGroupId] = useState<number | null>(null);
  const [providerId, setProviderId] = useState<number | null>(null);
  const [picture, setPicture] = useState<File | null>(null);
  const [picturePreview, setPicturePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] =
    useState<{ type: "error" | "success"; text: string } | null>(null);

  const isProvider = selectedRoles.includes(PROVIDERS_ROLE);
  const isNetworkGroupManager =
    selectedRoles.includes(NETWORK_GROUP_MANAGER_ROLE);

  const { data: groups, isLoading: groupsLoading } =
    useSWR<BaseInfoListResponse>(
      isNetworkGroupManager && groupNetworkId
        ? `/base-info/network-groups/${groupNetworkId}`
        : null,
    );

  const { data: providers, isLoading: providersLoading } =
    useSWR<BaseInfoListResponse>(
      isProvider ? "/base-info/providers" : null,
    );

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
        setProviderId(null);
        if (checked) {
          setSelectedNetworkIds([]);
          setGroupNetworkId(null);
          setNetworkGroupId(null);
        }
      }

      if (role === NETWORK_GROUP_MANAGER_ROLE && !checked) {
        setGroupNetworkId(null);
        setNetworkGroupId(null);
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

  function selectPicture(file: File | null) {
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setMessage({
        type: "error",
        text: "فرمت عکس باید JPG، PNG یا WEBP باشد.",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage({
        type: "error",
        text: "حجم عکس نباید بیشتر از ۲ مگابایت باشد.",
      });
      return;
    }

    if (picturePreview) URL.revokeObjectURL(picturePreview);
    setPicture(file);
    setPicturePreview(URL.createObjectURL(file));
    setMessage(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!session?.isSystemAdmin) {
      setMessage({
        type: "error",
        text: "فقط مدیر سیستم مجاز به تعریف کاربر است.",
      });
      return;
    }

    if (selectedRoles.length === 0) {
      setMessage({
        type: "error",
        text: "حداقل یک نقش برای کاربر انتخاب کنید.",
      });
      return;
    }

    if (isProvider && !providerId) {
      setMessage({
        type: "error",
        text: "برای نقش تهیه‌کننده، انتخاب تهیه‌کننده الزامی است.",
      });
      return;
    }

    if (
      isNetworkGroupManager &&
      (!groupNetworkId || !networkGroupId)
    ) {
      setMessage({
        type: "error",
        text: "برای مدیر گروه برنامه‌ساز، شبکه و گروه همان شبکه الزامی است.",
      });
      return;
    }

    const form = new FormData(event.currentTarget);
    const payload = {
      fullName: String(form.get("fullName") ?? "").trim(),
      userName: String(form.get("userName") ?? "").trim(),
      password: String(form.get("password") ?? ""),
      roles: selectedRoles,
      networkIds: isProvider ? [] : selectedNetworkIds,
      networkGroupId: isNetworkGroupManager ? networkGroupId : null,
      providerId: isProvider ? providerId : null,
    };

    setSaving(true);

    try {
      const requestBody = new FormData();
      requestBody.set("payload", JSON.stringify(payload));
      if (picture) requestBody.set("picture", picture);

      const response = await apiClient.post("/auth/register", requestBody);
      const createdName =
        response.data?.userName ?? payload.userName;
      const warning = response.data?.pictureUploadWarning as
        | string
        | null
        | undefined;

      setMessage({
        type: warning ? "error" : "success",
        text: warning
          ? `کاربر «${createdName}» ایجاد شد. ${warning}`
          : `کاربر «${createdName}» با موفقیت ایجاد شد.`,
      });

      event.currentTarget.reset();
      setSelectedRoles([]);
      setSelectedNetworkIds([]);
      setGroupNetworkId(null);
      setNetworkGroupId(null);
      setProviderId(null);
      setPicture(null);
      if (picturePreview) URL.revokeObjectURL(picturePreview);
      setPicturePreview(null);
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
            اطلاعات حساب، نقش‌ها و دسترسی سازمانی کاربر را تعریف کنید.
          </p>
        </div>
      </div>

      {sessionLoading ? (
        <Card>
          <CardContent className="pt-6">در حال بررسی دسترسی...</CardContent>
        </Card>
      ) : null}

      {session && !session.isSystemAdmin ? (
        <div className="alert alert-error">
          <ShieldAlert
            size={16}
            style={{ verticalAlign: "middle", marginLeft: 6 }}
          />
          دسترسی به این صفحه فقط برای مدیر سیستم مجاز است.
        </div>
      ) : null}

      {session?.isSystemAdmin ? (
        <form onSubmit={submit} className="grid" style={{ gap: 18 }}>
          <Card>
            <CardHeader>
              <CardTitle>اطلاعات حساب</CardTitle>
              <CardDescription>
                مشخصات اصلی ورود و تصویر پروفایل کاربر
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="image-picker" style={{ marginBottom: 18 }}>
                <div className="image-picker-preview">
                  {picturePreview ? (
                    <img src={picturePreview} alt="پیش‌نمایش عکس کاربر" />
                  ) : (
                    <Camera size={24} />
                  )}
                </div>
                <div className="image-picker-actions">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera size={16} />
                    انتخاب عکس کاربر
                  </Button>
                  <small>JPG، PNG یا WEBP — حداکثر ۲ مگابایت</small>
                  <input
                    ref={fileInputRef}
                    hidden
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) =>
                      selectPicture(event.target.files?.[0] ?? null)
                    }
                  />
                </div>
              </div>

              <div className="form-grid">
                <label className="field">
                  <span className="label">نام و نام خانوادگی *</span>
                  <Input name="fullName" required />
                </label>
                <label className="field">
                  <span className="label">نام کاربری *</span>
                  <Input
                    name="userName"
                    dir="ltr"
                    autoComplete="off"
                    required
                  />
                </label>
                <label className="field">
                  <span className="label">رمز عبور *</span>
                  <Input
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>نقش‌های کاربر</CardTitle>
              <CardDescription>
                نقش‌ها تعیین می‌کنند چه بخش‌هایی برای کاربر قابل استفاده باشد.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rolesLoading ? (
                <div className="muted">در حال دریافت نقش‌ها...</div>
              ) : null}

              <div className="role-grid">
                {(roles ?? []).map((role) => {
                  const active = selectedRoles.includes(role.name);
                  return (
                    <div
                      className={`role-card ${active ? "active" : ""}`}
                      key={role.id}
                    >
                      <div className="role-title">
                        <strong>{roleLabel(role.name)}</strong>
                        <small>{role.name}</small>
                      </div>
                      <Switch
                        checked={active}
                        onCheckedChange={(checked) =>
                          setRole(role.name, checked)
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {isProvider ? (
            <Card>
              <CardHeader>
                <CardTitle>انتخاب تهیه‌کننده</CardTitle>
                <CardDescription>
                  همه تهیه‌کننده‌ها نمایش داده می‌شوند. شبکه یا گروه روی حساب
                  تهیه‌کننده ذخیره نمی‌شود و دسترسی طرح‌ها از PlanProvider
                  تعیین خواهد شد.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <label className="field">
                  <span className="label">تهیه‌کننده *</span>
                  <select
                    className="select"
                    value={providerId ?? ""}
                    onChange={(event) =>
                      setProviderId(toPositiveInt(event.target.value))
                    }
                    disabled={providersLoading}
                    required
                  >
                    <option value="">
                      {providersLoading
                        ? "در حال دریافت همه تهیه‌کننده‌ها..."
                        : "انتخاب تهیه‌کننده"}
                    </option>
                    {(providers?.Data ?? []).map((provider) => {
                      const id = toPositiveInt(provider.Value);
                      return id ? (
                        <option
                          key={id}
                          value={id}
                          disabled={provider.Disabled}
                        >
                          {provider.Text}
                        </option>
                      ) : null;
                    })}
                  </select>
                  <small className="muted">
                    providerId همان Value پرسنل در سرویس اطلاعات پایه است.
                  </small>
                </label>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>دسترسی شبکه</CardTitle>
                <CardDescription>
                  شبکه‌های مجاز برای نقش‌های سازمانی این کاربر
                </CardDescription>
              </CardHeader>
              <CardContent>
                {networksLoading ? (
                  <div className="muted">در حال دریافت شبکه‌ها...</div>
                ) : null}

                <div className="role-grid">
                  {networkOptions.map((network) => {
                    const active = selectedNetworkIds.includes(network.id);
                    return (
                      <div
                        className={`role-card ${active ? "active" : ""}`}
                        key={network.id}
                      >
                        <div className="role-title">
                          <strong>{network.label}</strong>
                          <small>NetworkId: {network.id}</small>
                        </div>
                        <Switch
                          checked={active}
                          disabled={network.disabled}
                          onCheckedChange={(checked) =>
                            setNetwork(network.id, checked)
                          }
                        />
                      </div>
                    );
                  })}
                </div>

                {isNetworkGroupManager ? (
                  <div className="form-grid" style={{ marginTop: 18 }}>
                    <label className="field">
                      <span className="label">شبکه مدیر گروه *</span>
                      <select
                        className="select"
                        value={groupNetworkId ?? ""}
                        onChange={(event) => {
                          setGroupNetworkId(
                            toPositiveInt(event.target.value),
                          );
                          setNetworkGroupId(null);
                        }}
                        required
                      >
                        <option value="">انتخاب شبکه</option>
                        {networkOptions
                          .filter((network) =>
                            selectedNetworkIds.includes(network.id),
                          )
                          .map((network) => (
                            <option key={network.id} value={network.id}>
                              {network.label}
                            </option>
                          ))}
                      </select>
                    </label>

                    <label className="field">
                      <span className="label">گروه برنامه‌ساز *</span>
                      <select
                        className="select"
                        value={networkGroupId ?? ""}
                        onChange={(event) =>
                          setNetworkGroupId(
                            toPositiveInt(event.target.value),
                          )
                        }
                        disabled={!groupNetworkId || groupsLoading}
                        required
                      >
                        <option value="">
                          {groupsLoading
                            ? "در حال دریافت گروه‌های شبکه..."
                            : "انتخاب گروه همان شبکه"}
                        </option>
                        {(groups?.Data ?? []).map((group) => {
                          const id = toPositiveInt(group.Value);
                          return id ? (
                            <option
                              key={id}
                              value={id}
                              disabled={group.Disabled}
                            >
                              {group.Text}
                            </option>
                          ) : null;
                        })}
                      </select>
                    </label>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}

          {message ? (
            <div
              className={`alert ${
                message.type === "error"
                  ? "alert-error"
                  : "alert-success"
              }`}
            >
              {message.text}
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
            }}
          >
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/users")}
            >
              انصراف
            </Button>
            <Button
              type="submit"
              disabled={saving || rolesLoading || networksLoading}
            >
              {saving ? <Loader2 size={17} /> : <Save size={17} />}
              {saving ? "در حال ثبت..." : "ثبت کاربر"}
            </Button>
          </div>
        </form>
      ) : null}
    </DashboardShell>
  );
}

"use client";

import { SearchableSelect } from "@/components/ui/searchable-select";
import { FormEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { ArrowLeft, ArrowRight, Camera, Check, Loader2, Save, ShieldAlert, UserPlus, UsersRound } from "lucide-react";
import DashboardShell, { Breadcrumb } from "@/components/layout/dashboard-shell";
import { useSession } from "@/hooks/use-session";
import { apiClient, apiErrorMessage } from "@/lib/http/client";
import { showToast } from "@/lib/ui/toast";
import type { RoleResponse } from "@/lib/auth/types";
import type { BaseInfoListResponse } from "@/lib/base-info/browser-types";
import { roleLabel } from "@/lib/auth/roles";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { ProviderPicker } from "@/components/providers/provider-picker";

const PROVIDERS_ROLE = "Providers";
const NETWORK_GROUP_MANAGER_ROLE = "NetworkGroupManager";
const NETWORK_REQUIRED_ROLES = new Set<string>([
  "NetworkManager", "NetworkGroupManager", "BroadcastManager",
  "LiveSupervisor", "Supervisor", "PlanManager",
]);

function toPositiveInt(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function NewUserPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [wizardStep,setWizardStep]=useState(0);
  const [fieldErrors,setFieldErrors]=useState<Record<string,string>>({});
  const [reviewName,setReviewName]=useState("");
  const steps = ["اطلاعات حساب","نقش‌های کاربر","دسترسی سازمانی","بازبینی و ثبت"];
  function advanceWizard(){
    if(wizardStep===0){
      const form = new FormData(formRef.current ?? undefined);
      const errors:Record<string,string>={};
      const fullName=String(form.get("fullName")??"").trim();
      const userName=String(form.get("userName")??"").trim();
      const password=String(form.get("password")??"");
      if(!fullName) errors.fullName="نام و نام خانوادگی الزامی است.";
      if(!userName) errors.userName="نام کاربری الزامی است.";
      if(password.length<8) errors.password="رمز عبور باید حداقل ۸ کاراکتر داشته باشد.";
      setFieldErrors(errors);
      if(Object.keys(errors).length){formRef.current?.querySelector<HTMLInputElement>(`[name="${Object.keys(errors)[0]}"]`)?.focus();return;}
      setReviewName(fullName);
    }
    if(wizardStep===1 && selectedRoleIds.length===0){setMessage({type:"error",text:"حداقل یک نقش انتخاب کنید."});return;}
    if(wizardStep===1 && isProvider && requiresNetwork){setMessage({type:"error",text:"نقش تهیه‌کننده را نمی‌توان با نقش‌های نیازمند شبکه در این فرم ترکیب کرد."});return;}
    if(wizardStep===2){
      const error = assignmentError();
      if(error){setMessage({type:"error",text:error});return;}
    }
    setMessage(null);
    setWizardStep(v=>Math.min(v+1,3));
  }
  const { data: session, isLoading: sessionLoading } = useSession();

  const { data: roles, isLoading: rolesLoading } =
    useSWR<RoleResponse[]>("/auth/roles");
  const { data: networks, isLoading: networksLoading } =
    useSWR<BaseInfoListResponse>("/base-info/networks");

  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [selectedNetworkIds, setSelectedNetworkIds] = useState<number[]>([]);
  const [groupNetworkId, setGroupNetworkId] = useState<number | null>(null);
  const [networkGroupId, setNetworkGroupId] = useState<number | null>(null);
  const [providerId, setProviderId] = useState<number | null>(null);
  const [picture, setPicture] = useState<File | null>(null);
  const [picturePreview, setPicturePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] =
    useState<{ type: "error" | "success"; text: string } | null>(null);

  const selectedSystemKeys = (roles ?? []).filter((role) => selectedRoleIds.includes(role.id))
    .map((role) => role.systemKey ?? (role.isSystemRole ? role.name : null));
  const isProvider = selectedSystemKeys.includes(PROVIDERS_ROLE);
  const isNetworkGroupManager = selectedSystemKeys.includes(NETWORK_GROUP_MANAGER_ROLE);
  const requiresNetwork = selectedSystemKeys.some(key => key !== null && NETWORK_REQUIRED_ROLES.has(key));

  function assignmentError(): string | null {
    if (isProvider && requiresNetwork) return "نقش تهیه‌کننده را نمی‌توان با نقش‌های نیازمند شبکه در این فرم ترکیب کرد.";
    if (isProvider && !providerId) return "برای نقش تهیه‌کننده، انتخاب تهیه‌کننده الزامی است.";
    if (requiresNetwork && selectedNetworkIds.length === 0) return "برای نقش‌های انتخاب‌شده، انتخاب حداقل یک شبکه الزامی است.";
    if (isNetworkGroupManager && (!groupNetworkId || !selectedNetworkIds.includes(groupNetworkId) || !networkGroupId)) return "برای مدیر گروه برنامه‌ساز، شبکه و گروه همان شبکه الزامی است.";
    return null;
  }

  const { data: groups, isLoading: groupsLoading } =
    useSWR<BaseInfoListResponse>(
      isNetworkGroupManager && groupNetworkId
        ? `/base-info/network-groups/${groupNetworkId}`
        : null,
    );

  const { data: providers, isLoading: providersLoading, error: providersError } =
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

  function setRole(role: RoleResponse, checked: boolean) {
    const key = role.systemKey ?? (role.isSystemRole ? role.name : null);
    setSelectedRoleIds((current) => {
      const next = checked
        ? Array.from(new Set([...current, role.id]))
        : current.filter((item) => item !== role.id);

      if (key === PROVIDERS_ROLE) {
        setProviderId(null);
        if (checked) {
          setSelectedNetworkIds([]);
          setGroupNetworkId(null);
          setNetworkGroupId(null);
        }
      }

      if (key === NETWORK_GROUP_MANAGER_ROLE && !checked) {
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

    if (selectedRoleIds.length === 0) {
      setMessage({
        type: "error",
        text: "حداقل یک نقش برای کاربر انتخاب کنید.",
      });
      return;
    }

    const assignmentValidation = assignmentError();
    if (assignmentValidation) {
      setMessage({ type: "error", text: assignmentValidation });
      setWizardStep(isProvider && requiresNetwork ? 1 : 2);
      return;
    }

    const form = new FormData(event.currentTarget);
    const fieldErrors:Record<string,string>={};
    if(!String(form.get("fullName")??"").trim())fieldErrors.fullName="نام و نام خانوادگی الزامی است.";
    if(!String(form.get("userName")??"").trim())fieldErrors.userName="نام کاربری الزامی است.";
    if(String(form.get("password")??"").length<8)fieldErrors.password="رمز عبور باید حداقل ۸ کاراکتر داشته باشد.";
    if(Object.keys(fieldErrors).length){setFieldErrors(fieldErrors);setWizardStep(0);return;}
    const payload = {
      fullName: String(form.get("fullName") ?? "").trim(),
      userName: String(form.get("userName") ?? "").trim(),
      password: String(form.get("password") ?? ""),
      roleIds: selectedRoleIds,
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

      const successText = warning
        ? `کاربر «${createdName}» با موفقیت ایجاد شد. ${warning}`
        : `کاربر «${createdName}» با موفقیت ایجاد شد.`;

      // ایجاد کاربر موفق است حتی اگر بارگذاری عکس هشدار جداگانه داشته باشد.
      showToast({ type: "success", message: successText }, true);
      router.push("/users");
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
        <form ref={formRef} noValidate onSubmit={submit} className="grid" style={{ gap: 18 }}>
          <nav aria-label="مراحل تعریف کاربر" className="pmd-wizard-nav rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4">
            <ol className="grid grid-cols-2 gap-2 lg:grid-cols-4">{steps.map((title,index)=><li key={title}>
              <button type="button" disabled={index>wizardStep||saving} onClick={()=>setWizardStep(index)} aria-current={wizardStep===index?"step":undefined} className={`flex w-full items-center gap-2 rounded-xl border px-3 py-3 text-right text-xs font-semibold ${wizardStep===index?"border-primary bg-primary/10 text-primary":"border-border text-muted-foreground"}`}>
                <span className={`grid size-7 shrink-0 place-items-center rounded-full ${index<=wizardStep?"bg-primary text-primary-foreground":"bg-muted text-muted-foreground"}`}>{index<wizardStep?<Check size={15}/>:index+1}</span>{title}
              </button>
            </li>)}</ol>
          </nav>
          <div className={wizardStep===0?"":"hidden"}>
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
                  <Input name="fullName" required aria-invalid={Boolean(fieldErrors.fullName)} onChange={(event)=>{if(fieldErrors.fullName)setFieldErrors(current=>({...current,fullName:event.target.value.trim()?"":"نام و نام خانوادگی الزامی است."}));}} />
                  {fieldErrors.fullName?<span role="alert" className="text-xs text-destructive">{fieldErrors.fullName}</span>:null}
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
                   {fieldErrors.password?<span role="alert" className="text-xs text-destructive">{fieldErrors.password}</span>:null}
                </label>
              </div>
            </CardContent>
          </Card>
          </div>

          <div className={wizardStep===1?"":"hidden"}>
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
                  const active = selectedRoleIds.includes(role.id);
                  return (
                    <div
                      className={`role-card ${active ? "active" : ""}`}
                      key={role.id}
                    >
                      <div className="role-title">
                        <strong>{roleLabel(role)}</strong>
                        <small>{role.name}</small>
                      </div>
                      <Switch
                        checked={active}
                        onCheckedChange={(checked) =>
                          setRole(role, checked)
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          </div>

          <div className={wizardStep===2?"":"hidden"}>
          {isProvider ? (
            <Card>
              <CardHeader>
                <CardTitle>انتخاب تهیه‌کننده</CardTitle>
                <CardDescription>
                  تهیه‌کننده را با جست‌وجوی نام انتخاب کنید. شبکه یا گروه روی حساب
                  تهیه‌کننده ذخیره نمی‌شود و دسترسی طرح‌ها از PlanProvider
                  تعیین خواهد شد.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProviderPicker data={providers} value={providerId} onChange={setProviderId} loading={providersLoading} error={providersError} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>دسترسی شبکه {requiresNetwork ? "*" : ""}</CardTitle>
                <CardDescription>
                  {requiresNetwork ? "انتخاب حداقل یک شبکه برای نقش‌های انتخاب‌شده الزامی است." : "شبکه‌های مجاز برای نقش‌های سازمانی این کاربر (اختیاری)"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {networksLoading ? (
                  <div className="muted">در حال دریافت شبکه‌ها...</div>
                ) : null}

                {requiresNetwork && selectedNetworkIds.length === 0 ? (
                  <p className="mb-3 text-sm text-destructive" role="status">حداقل یک شبکه را انتخاب کنید.</p>
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
                      <SearchableSelect
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
                      </SearchableSelect>
                    </label>

                    <label className="field">
                      <span className="label">گروه برنامه‌ساز *</span>
                      <SearchableSelect
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
                      </SearchableSelect>
                    </label>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}
          </div>

          {wizardStep===3 ? <section className="card">
            <h2 className="mb-4 text-lg font-bold">بازبینی اطلاعات کاربر</h2>
            <div className="grid gap-4 text-sm md:grid-cols-2">
              <div><span className="text-muted-foreground">نام کاربر</span><p className="mt-1 font-semibold">{reviewName}</p></div>
              <div><span className="text-muted-foreground">تعداد نقش‌ها</span><p className="mt-1 font-semibold">{selectedRoleIds.length.toLocaleString("fa-IR", { useGrouping: false })}</p></div>
              <div><span className="text-muted-foreground">دسترسی شبکه</span><p className="mt-1 font-semibold">{isProvider?"بر اساس تهیه‌کننده":(networkOptions.filter(network => selectedNetworkIds.includes(network.id)).map(network => network.label).join("، ") || "شبکه‌ای انتخاب نشده")}</p></div>
            </div>
          </section> : null}

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
            <Button type="button" variant="outline" disabled={wizardStep===0||saving} onClick={()=>setWizardStep(v=>Math.max(0,v-1))}><ArrowRight size={16}/>مرحله قبل</Button>
            {wizardStep<3 ? <Button type="button" onClick={advanceWizard}>مرحله بعد<ArrowLeft size={16}/></Button> : <Button
              type="submit"
              disabled={saving || rolesLoading || networksLoading}
            >
              {saving ? <Loader2 size={17} /> : <Save size={17} />}
              {saving ? "در حال ثبت..." : "ثبت کاربر"}
            </Button>}
          </div>
        </form>
      ) : null}
    </DashboardShell>
  );
}

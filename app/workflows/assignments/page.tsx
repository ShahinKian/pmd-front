"use client";

import { SearchableSelect } from "@/components/ui/searchable-select";
import { FormEvent, useMemo, useState } from "react";
import useSWR from "swr";
import { Edit3, Loader2, Plus, Save, Settings2 } from "lucide-react";
import DashboardShell, { Breadcrumb } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GroupedNumberInput } from "@/components/ui/grouped-number-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import StatusAlert from "@/components/ui/status-alert";
import { useSession } from "@/hooks/use-session";
import { apiClient, apiErrorMessage } from "@/lib/http/client";
import type { BaseInfoListResponse } from "@/lib/base-info/browser-types";
import {
  WorkflowDefinitionStatus,
  type WorkflowAssignment,
  type WorkflowDefinition,
  type WorkflowFormType,
} from "@/lib/workflows/types";

type BackendForm = {
  key: string;
  name: string;
  version: number;
  fields: Array<{ key: string; label: string; type: string }>;
};

function toPositiveInt(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function WorkflowAssignmentsPage() {
  const { data: session } = useSession();
  const { data: workflows } = useSWR<WorkflowDefinition[]>("/workflows");
  const { data: registry, error: registryError, mutate: refreshRegistry } = useSWR<BackendForm[]>(
    session?.isSystemAdmin ? "/workflows/actions?registry=1" : null,
  );
  const { data: networks } = useSWR<BaseInfoListResponse>("/base-info/networks");
  const {
    data: formTypes,
    error: formTypesError,
    mutate: mutateFormTypes,
  } = useSWR<WorkflowFormType[]>("/workflows/form-types?includeInactive=true");
  const {
    data: assignments,
    mutate: mutateAssignments,
  } = useSWR<WorkflowAssignment[]>("/workflows/assignments");

  const [formTypeId, setFormTypeId] = useState("");
  const [networkId, setNetworkId] = useState<number | null>(null);
  const [workflowDefinitionId, setWorkflowDefinitionId] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [savingAssignment, setSavingAssignment] = useState(false);

  const [editingFormType, setEditingFormType] = useState<WorkflowFormType | null>(null);
  const [registryKey, setRegistryKey] = useState("");
  const [formTypeName, setFormTypeName] = useState("");
  const [formTypeSortOrder, setFormTypeSortOrder] = useState("0");
  const [formTypeActive, setFormTypeActive] = useState(true);
  const [savingFormType, setSavingFormType] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const activeWorkflows = useMemo(
    () => (workflows ?? []).filter((item) => item.status === WorkflowDefinitionStatus.Active),
    [workflows],
  );

  const activeFormTypes = useMemo(
    () => (formTypes ?? []).filter((item) => item.isActive && (registry ?? []).some(r => r.key === item.key)),
    [formTypes, registry],
  );

  const availableForms = (registry ?? []).filter((form) =>
    !(formTypes ?? []).some((registered) => registered.key === form.key));
  const formCatalogLoading = !registry || !formTypes;

  const networkOptions = useMemo(
    () =>
      (networks?.Data ?? [])
        .map((item) => ({ id: toPositiveInt(item.Value), label: item.Text }))
        .filter((item): item is { id: number; label: string } => item.id !== null),
    [networks],
  );

  const workflowName = (id: string) => {
    const workflow = workflows?.find((item) => item.id === id);
    return workflow ? workflow.name + " - v" + workflow.version : id;
  };

  const networkName = (id: number | null) =>
    id === null
      ? "همه شبکه‌ها (پیش‌فرض سراسری)"
      : networkOptions.find((item) => item.id === id)?.label ?? "شبکه " + id;

  async function saveAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeFormTypes.some((item) => item.id === formTypeId)) {
      setMessage({ type: "error", text: "نوع فرم را انتخاب کنید." });
      return;
    }
    if (!workflowDefinitionId) {
      setMessage({ type: "error", text: "Workflow فعال را انتخاب کنید." });
      return;
    }

    setSavingAssignment(true);
    setMessage(null);
    try {
      await apiClient.put("/workflows/assignments", {
        formTypeId,
        networkId,
        workflowDefinitionId,
        isEnabled,
      });
      await mutateAssignments();
      setMessage({ type: "success", text: "تخصیص Workflow با موفقیت ذخیره شد." });
    } catch (e) {
      setMessage({
        type: "error",
        text: apiErrorMessage(e, "ثبت تخصیص Workflow انجام نشد."),
      });
    } finally {
      setSavingAssignment(false);
    }
  }

  function resetFormTypeEditor() {
    setEditingFormType(null);
    setRegistryKey("");
    setFormTypeName("");
    setFormTypeSortOrder("0");
    setFormTypeActive(true);
  }

  function selectBackendForm(key: string) {
    setRegistryKey(key);
    setFormTypeName(availableForms.find((form) => form.key === key)?.name ?? "");
    setMessage(null);
  }

  async function saveFormType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingFormType) return;

    const key = editingFormType?.key ?? availableForms.find((form) => form.key === registryKey)?.key;
    const name = formTypeName.trim();
    const sortOrder = Number(formTypeSortOrder);
    if (!key || !name || !Number.isInteger(sortOrder)) {
      setMessage({ type: "error", text: "فرم، عنوان و ترتیب را بررسی کنید." });
      return;
    }

    const payload = { key, name, sortOrder, isActive: formTypeActive };
    setSavingFormType(true);
    setMessage(null);
    try {
      const { data: saved } = editingFormType
        ? await apiClient.put<WorkflowFormType>("/workflows/form-types/" + editingFormType.id, payload)
        : await apiClient.post<WorkflowFormType>("/workflows/form-types", payload);

      await mutateFormTypes((current = []) =>
        [...current.filter((item) => item.id !== saved.id), saved]
          .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, "fa")),
        { revalidate: false });
      if (saved.isActive && registry?.some((form) => form.key === saved.key)) setFormTypeId(saved.id);
      else if (formTypeId === saved.id) setFormTypeId("");
      if (editingFormType) void mutateAssignments();
      resetFormTypeEditor();

      setMessage({
        type: "success",
        text: editingFormType ? "نوع فرم ویرایش شد." : "فرم بک‌اند ثبت شد.",
      });
    } catch (e) {
      void mutateFormTypes();
      setMessage({ type: "error", text: apiErrorMessage(e, "ذخیره نوع فرم انجام نشد.") });
    } finally {
      setSavingFormType(false);
    }
  }

  function editFormType(item: WorkflowFormType) {
    setEditingFormType(item);
    setFormTypeName(item.name);
    setFormTypeSortOrder(String(item.sortOrder));
    setFormTypeActive(item.isActive);
    setMessage(null);
    document.getElementById("workflow-form-type-editor")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <DashboardShell>
      <Breadcrumb
        items={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "مدیریت فرآیندها", href: "/workflows" },
          { label: "تخصیص Workflow" },
        ]}
      />

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-default-900">تخصیص Workflow به فرم و شبکه</h1>
        <p className="mt-1 text-sm text-default-500">
          نوع فرم‌ها قابل تعریف هستند و تخصیص اختصاصی شبکه نسبت به Workflow سراسری اولویت دارد.
        </p>
      </div>

      {session && !session.isSystemAdmin ? (
        <StatusAlert
          type="warning"
          title="دسترسی محدود"
          message="مدیریت نوع فرم و تخصیص Workflow فقط برای مدیر سیستم مجاز است."
        />
      ) : null}

      {session?.isSystemAdmin ? (
        <div className="space-y-6">
          {message ? (
            <StatusAlert
              type={message.type}
              message={message.text}
              dismissible
              onDismiss={() => setMessage(null)}
            />
          ) : null}

          <section id="workflow-form-type-editor" className="rounded-xl border bg-card p-5">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="font-semibold text-default-800">
                    {editingFormType ? "ویرایش نوع فرم" : "تعریف نوع فرم"}
                  </h2>
                  <p className="mt-1 text-xs text-default-500">
                    فقط فرم‌های واقعی ثبت‌شده در سامانه قابل تخصیص هستند. شناسه فنی هر فرم ثابت است.
                  </p>
                </div>
              </div>

              {editingFormType ? (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={savingFormType}
                  onClick={resetFormTypeEditor}
                >
                  انصراف از ویرایش
                </Button>
              ) : null}
            </div>

            {(registryError || formTypesError) ? (
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <StatusAlert type="error" message="فهرست فرم‌های بک‌اند یا فرم‌های ثبت‌شده دریافت نشد." />
                <Button type="button" variant="outline" onClick={() => {
                  void refreshRegistry();
                  void mutateFormTypes();
                }}>تلاش دوباره</Button>
              </div>
            ) : formCatalogLoading ? (
              <p className="mb-4 text-sm text-default-500" role="status">در حال دریافت فرم‌ها…</p>
            ) : null}

            {(editingFormType || (!formCatalogLoading && availableForms.length > 0)) && (
              <form onSubmit={saveFormType} className="mb-5 rounded-lg border p-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <Label htmlFor="backend-workflow-form" className="mb-2 text-default-600">فرم بک‌اند</Label>
                    {editingFormType ? (
                      <Input id="backend-workflow-form" dir="ltr" value={editingFormType.key} readOnly />
                    ) : (
                      <SearchableSelect
                        id="backend-workflow-form"
                        className="select"
                        value={registryKey}
                        disabled={savingFormType}
                        onChange={(event) => selectBackendForm(event.target.value)}
                        required
                      >
                        <option value="">انتخاب فرم بک‌اند</option>
                        {availableForms.map((form) => <option key={form.key} value={form.key}>{form.name}</option>)}
                      </SearchableSelect>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="workflow-form-name" className="mb-2 text-default-600">عنوان فرم</Label>
                    <Input id="workflow-form-name" className="input" maxLength={200} required value={formTypeName}
                      disabled={savingFormType} onChange={(event) => setFormTypeName(event.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="workflow-form-sort-order" className="mb-2 text-default-600">ترتیب نمایش</Label>
                    <GroupedNumberInput id="workflow-form-sort-order" value={formTypeSortOrder} disabled={savingFormType}
                      min={-2147483648} max={2147483647} required onValueChange={setFormTypeSortOrder} />
                  </div>
                  <div className="flex items-end">
                    <label className="flex h-10 w-full items-center justify-between rounded-md border px-3">
                      <span className="text-sm text-default-700">فعال برای تخصیص</span>
                      <Switch checked={formTypeActive} disabled={savingFormType} onCheckedChange={setFormTypeActive} />
                    </label>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button type="submit" disabled={savingFormType || (!editingFormType && (!registryKey || formCatalogLoading))}>
                    {savingFormType ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {editingFormType ? "ذخیره تغییرات" : "ثبت فرم برای تخصیص"}
                  </Button>
                </div>
              </form>
            )}

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {(registry ?? []).map(form => {
                const matched = (formTypes ?? []).find(t => t.key === form.key);
                return <div key={form.key} className="rounded-lg border bg-default-50 p-4">
                  <div className="font-semibold">{matched?.name ?? form.name}</div>
                  <p className="mt-1 text-xs text-default-500">نسخه قرارداد {form.version} · {form.fields.length} فیلد معتبر</p>
                  <code dir="ltr" className="mt-2 block text-xs">{form.key}</code>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-xs">{!formTypes ? "در حال دریافت وضعیت…" : matched?.isActive ? "فعال و قابل تخصیص" : matched ? "غیرفعال" : "آماده ثبت"}</span>
                    {matched
                      ? <Button type="button" size="sm" variant="ghost" disabled={savingFormType} onClick={() => editFormType(matched)}>ویرایش</Button>
                      : formTypes && <Button type="button" size="sm" variant="ghost" disabled={savingFormType} onClick={() => {
                        resetFormTypeEditor();
                        selectBackendForm(form.key);
                      }}>انتخاب برای ثبت</Button>}
                  </div>
                </div>;
              })}
            </div>
            {registry?.length === 0 && <p className="text-sm text-default-500">فرم متصل به گردش‌کار در بک‌اند پیدا نشد.</p>}
          </section>

          <section className="overflow-hidden rounded-xl border bg-card">
            <div className="border-b px-5 py-4">
              <h2 className="font-semibold text-default-800">نوع فرم‌های تعریف‌شده</h2>
              <p className="mt-1 text-xs text-default-500">
                نوع فرم غیرفعال برای تخصیص جدید قابل انتخاب نیست، ولی سوابق قبلی حفظ می‌شوند.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead className="bg-default-50">
                  <tr>
                    <th className="px-4 py-3 text-right">عنوان</th>
                    
                    <th className="px-4 py-3 text-right">ترتیب</th>
                    <th className="px-4 py-3 text-right">وضعیت</th>
                    <th className="px-4 py-3 text-right">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {(formTypes ?? []).map((item) => (
                    <tr key={item.id} className="border-t hover:bg-default-50">
                      <td className="px-4 py-3 font-medium text-default-700">{item.name}</td>
                      
                      <td className="px-4 py-3 text-default-600">{item.sortOrder}</td>
                      <td className="px-4 py-3">
                        <span className={item.isActive ? "text-success" : "text-default-400"}>
                          {item.isActive ? "فعال" : "غیرفعال"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" onClick={() => editFormType(item)}>
                          <Edit3 className="h-4 w-4" />
                          ویرایش
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <form onSubmit={saveAssignment} className="rounded-xl border bg-card p-5">
            <div className="mb-5 flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-semibold text-default-800">تعریف سیاست Workflow</h2>
                <p className="mt-1 text-xs text-default-500">
                  یک Workflow فعال را برای نوع فرم و در صورت نیاز برای یک شبکه خاص انتخاب کنید.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <Label className="mb-2 text-default-600">نوع فرم *</Label>
                <SearchableSelect
                  value={formTypeId}
                  disabled={activeFormTypes.length === 0}
                  onChange={(event) => setFormTypeId(event.target.value)}
                  required
                  className="h-10 w-full rounded-md border border-default-300 bg-background px-3 text-sm"
                >
                  <option value="">{activeFormTypes.length ? "انتخاب نوع فرم" : "ابتدا یک فرم بک‌اند را ثبت و فعال کنید"}</option>
                  {activeFormTypes.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </SearchableSelect>
              </div>

              <div>
                <Label className="mb-2 text-default-600">شبکه</Label>
                <SearchableSelect
                  value={networkId ?? ""}
                  onChange={(event) => setNetworkId(toPositiveInt(event.target.value))}
                  className="h-10 w-full rounded-md border border-default-300 bg-background px-3 text-sm"
                >
                  <option value="">همه شبکه‌ها (سراسری)</option>
                  {networkOptions.map((network) => (
                    <option key={network.id} value={network.id}>{network.label}</option>
                  ))}
                </SearchableSelect>
              </div>

              <div>
                <Label className="mb-2 text-default-600">Workflow فعال *</Label>
                <SearchableSelect
                  value={workflowDefinitionId}
                  onChange={(event) => setWorkflowDefinitionId(event.target.value)}
                  required
                  className="h-10 w-full rounded-md border border-default-300 bg-background px-3 text-sm"
                >
                  <option value="">انتخاب Workflow</option>
                  {activeWorkflows.map((workflow) => (
                    <option key={workflow.id} value={workflow.id}>
                      {workflow.name} - v{workflow.version}
                    </option>
                  ))}
                </SearchableSelect>
              </div>

              <div className="flex items-end">
                <label className="flex h-10 w-full items-center justify-between rounded-md border px-3">
                  <span className="text-sm text-default-700">فعال</span>
                  <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
                </label>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <Button type="submit" disabled={savingAssignment || !activeFormTypes.some((item) => item.id === formTypeId) || !workflowDefinitionId}>
                {savingAssignment ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                ذخیره تخصیص
              </Button>
            </div>
          </form>

          <section className="overflow-hidden rounded-xl border bg-card">
            <div className="border-b px-5 py-4">
              <h2 className="font-semibold text-default-800">تخصیص‌های ثبت‌شده</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-sm">
                <thead className="bg-default-50">
                  <tr>
                    <th className="px-4 py-3 text-right">فرم</th>
                    <th className="px-4 py-3 text-right">دامنه شبکه</th>
                    <th className="px-4 py-3 text-right">Workflow</th>
                    <th className="px-4 py-3 text-right">وضعیت</th>
                    <th className="px-4 py-3 text-right">آخرین تغییر</th>
                  </tr>
                </thead>
                <tbody>
                  {(assignments ?? []).map((item) => (
                    <tr key={item.id} className="border-t hover:bg-default-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-default-700">{item.formTypeName}</div>
                        <div className="mt-1 font-mono text-[11px] text-default-400" dir="ltr">
                          {item.formTypeKey}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-default-600">{networkName(item.networkId)}</td>
                      <td className="px-4 py-3 text-primary">{workflowName(item.workflowDefinitionId)}</td>
                      <td className="px-4 py-3">
                        <span className={item.isEnabled ? "text-success" : "text-destructive"}>
                          {item.isEnabled ? "فعال" : "غیرفعال"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-default-500">
                        {new Date(item.updatedAt).toLocaleString("fa-IR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(assignments?.length ?? 0) === 0 ? (
              <div className="p-10 text-center text-default-500">هنوز تخصیصی ثبت نشده است.</div>
            ) : null}
          </section>
        </div>
      ) : null}
    </DashboardShell>
  );
}

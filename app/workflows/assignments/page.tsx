"use client";

import { FormEvent, useMemo, useState } from "react";
import useSWR from "swr";
import { Loader2, Save, Settings2 } from "lucide-react";
import DashboardShell, { Breadcrumb } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSession } from "@/hooks/use-session";
import { apiClient, apiErrorMessage } from "@/lib/http/client";
import type { BaseInfoListResponse } from "@/lib/base-info/browser-types";
import {
  WorkflowDefinitionStatus,
  WorkflowFormKind,
  workflowFormKindLabels,
  type WorkflowAssignment,
  type WorkflowDefinition,
} from "@/lib/workflows/types";

function toPositiveInt(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function WorkflowAssignmentsPage() {
  const { data: session } = useSession();
  const { data: workflows } = useSWR<WorkflowDefinition[]>("/workflows");
  const { data: networks } = useSWR<BaseInfoListResponse>("/base-info/networks");
  const { data: assignments, mutate } = useSWR<WorkflowAssignment[]>("/workflows/assignments");

  const [formKind, setFormKind] = useState<WorkflowFormKind>(WorkflowFormKind.Forecast);
  const [networkId, setNetworkId] = useState<number | null>(null);
  const [workflowDefinitionId, setWorkflowDefinitionId] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const activeWorkflows = useMemo(
    () => (workflows ?? []).filter((item) => item.status === WorkflowDefinitionStatus.Active),
    [workflows],
  );

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
    id === null ? "همه شبکه‌ها (پیش‌فرض سراسری)" : networkOptions.find((item) => item.id === id)?.label ?? "شبکه " + id;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workflowDefinitionId) {
      setMessage({ type: "error", text: "Workflow فعال را انتخاب کنید." });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      await apiClient.put("/workflows/assignments", {
        formKind,
        networkId,
        workflowDefinitionId,
        isEnabled,
      });
      await mutate();
      setMessage({ type: "success", text: "تخصیص Workflow با موفقیت ذخیره شد." });
    } catch (e) {
      setMessage({ type: "error", text: apiErrorMessage(e, "ثبت تخصیص Workflow انجام نشد.") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell>
      <Breadcrumb items={[
        { label: "داشبورد", href: "/dashboard" },
        { label: "مدیریت فرآیندها", href: "/workflows" },
        { label: "تخصیص Workflow" },
      ]} />

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-default-900">تخصیص Workflow به فرم و شبکه</h1>
        <p className="mt-1 text-sm text-default-500">
          تخصیص اختصاصی شبکه نسبت به Workflow سراسری اولویت دارد.
        </p>
      </div>

      {session && !session.isSystemAdmin ? (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-destructive">
          این بخش فقط برای مدیر سیستم مجاز است.
        </div>
      ) : null}

      {session?.isSystemAdmin ? (
        <>
          <form onSubmit={submit} className="mb-6 rounded-xl border bg-card p-5">
            <div className="mb-5 flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-default-800">تعریف سیاست Workflow</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <Label className="mb-2 text-default-600">نوع فرم *</Label>
                <select
                  value={formKind}
                  onChange={(event) => setFormKind(Number(event.target.value) as WorkflowFormKind)}
                  className="h-10 w-full rounded-md border border-default-300 bg-background px-3 text-sm"
                >
                  {Object.entries(workflowFormKindLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="mb-2 text-default-600">شبکه</Label>
                <select
                  value={networkId ?? ""}
                  onChange={(event) => setNetworkId(toPositiveInt(event.target.value))}
                  className="h-10 w-full rounded-md border border-default-300 bg-background px-3 text-sm"
                >
                  <option value="">همه شبکه‌ها (سراسری)</option>
                  {networkOptions.map((network) => (
                    <option key={network.id} value={network.id}>{network.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="mb-2 text-default-600">Workflow فعال *</Label>
                <select
                  value={workflowDefinitionId}
                  onChange={(event) => setWorkflowDefinitionId(event.target.value)}
                  required
                  className="h-10 w-full rounded-md border border-default-300 bg-background px-3 text-sm"
                >
                  <option value="">انتخاب Workflow</option>
                  {activeWorkflows.map((workflow) => (
                    <option key={workflow.id} value={workflow.id}>{workflow.name} - v{workflow.version}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <label className="flex h-10 w-full items-center justify-between rounded-md border px-3">
                  <span className="text-sm text-default-700">فعال</span>
                  <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
                </label>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <Button disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                ذخیره تخصیص
              </Button>
            </div>

            {message ? (
              <div className={message.type === "error"
                ? "mt-4 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
                : "mt-4 rounded-md border border-success/20 bg-success/10 p-3 text-sm text-success"}>
                {message.text}
              </div>
            ) : null}
          </form>

          <div className="overflow-hidden rounded-xl border bg-card">
            <table className="w-full text-sm">
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
                    <td className="px-4 py-3 font-medium text-default-700">{workflowFormKindLabels[item.formKind] ?? item.formKind}</td>
                    <td className="px-4 py-3 text-default-600">{networkName(item.networkId)}</td>
                    <td className="px-4 py-3 text-primary">{workflowName(item.workflowDefinitionId)}</td>
                    <td className="px-4 py-3">
                      <span className={item.isEnabled ? "text-success" : "text-destructive"}>{item.isEnabled ? "فعال" : "غیرفعال"}</span>
                    </td>
                    <td className="px-4 py-3 text-default-500">{new Date(item.updatedAt).toLocaleString("fa-IR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(assignments?.length ?? 0) === 0 ? <div className="p-10 text-center text-default-500">هنوز تخصیصی ثبت نشده است.</div> : null}
          </div>
        </>
      ) : null}
    </DashboardShell>
  );
}

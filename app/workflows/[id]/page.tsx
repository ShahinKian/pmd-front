"use client";

import { FormEvent, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { ArrowLeftRight, CheckCircle2, GitBranch, Layers3, Loader2, Plus, RefreshCcw } from "lucide-react";
import DashboardShell, { Breadcrumb } from "@/components/layout/dashboard-shell";
import MermaidDiagram from "@/components/workflows/mermaid-diagram";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { apiClient, apiErrorMessage } from "@/lib/http/client";
import type { RoleResponse } from "@/lib/auth/types";
import {
  WorkflowDefinitionStatus,
  WorkflowNodeType,
  workflowNodeTypeLabels,
  workflowStatusLabels,
  type WorkflowDefinition,
} from "@/lib/workflows/types";

export default function WorkflowDesignerPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { data, error, isLoading, mutate } = useSWR<WorkflowDefinition>(id ? "/workflows/" + id : null);
  const { data: roles } = useSWR<RoleResponse[]>("/auth/roles");
  const { data: definitions } = useSWR<WorkflowDefinition[]>("/workflows");

  const [nodeType, setNodeType] = useState<WorkflowNodeType>(WorkflowNodeType.Process);
  const [isStart, setIsStart] = useState(false);
  const [allowBacktrack, setAllowBacktrack] = useState(false);
  const [nodeBusy, setNodeBusy] = useState(false);
  const [transitionBusy, setTransitionBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState<"activate" | "revision" | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [diagramRevision, setDiagramRevision] = useState(0);

  const draft = data?.status === WorkflowDefinitionStatus.Draft;
  const subprocessOptions = useMemo(
    () => (definitions ?? []).filter((item) => item.id !== id && item.status === WorkflowDefinitionStatus.Active),
    [definitions, id],
  );

  async function refreshDesigner() {
    await mutate();
    setDiagramRevision((value) => value + 1);
  }

  async function addNode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    setNodeBusy(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const metadata = String(form.get("metadataJson") ?? "").trim();

    if (metadata) {
      try { JSON.parse(metadata); }
      catch {
        setMessage({ type: "error", text: "MetadataJson باید JSON معتبر باشد." });
        setNodeBusy(false);
        return;
      }
    }

    try {
      await apiClient.post("/workflows/" + id + "/nodes", {
        key: String(form.get("key") ?? "").trim(),
        name: String(form.get("name") ?? "").trim(),
        type: nodeType,
        description: String(form.get("description") ?? "").trim() || null,
        assignedRole: String(form.get("assignedRole") ?? "").trim() || null,
        isStart,
        allowBacktrack,
        sortOrder: Number(form.get("sortOrder") ?? 0),
        decisionKey: nodeType === WorkflowNodeType.Decision ? String(form.get("decisionKey") ?? "").trim() || null : null,
        subWorkflowDefinitionId: nodeType === WorkflowNodeType.SubProcess ? String(form.get("subWorkflowDefinitionId") ?? "").trim() || null : null,
        metadataJson: metadata || null,
      });
      event.currentTarget.reset();
      setNodeType(WorkflowNodeType.Process);
      setIsStart(false);
      setAllowBacktrack(false);
      await refreshDesigner();
      setMessage({ type: "success", text: "گره جدید به فرآیند اضافه شد." });
    } catch (e) {
      setMessage({ type: "error", text: apiErrorMessage(e, "افزودن گره انجام نشد.") });
    } finally {
      setNodeBusy(false);
    }
  }

  async function addTransition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    setTransitionBusy(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);

    try {
      await apiClient.post("/workflows/" + id + "/transitions", {
        fromNodeId: String(form.get("fromNodeId") ?? ""),
        toNodeId: String(form.get("toNodeId") ?? ""),
        name: String(form.get("name") ?? "").trim() || null,
        outcome: String(form.get("outcome") ?? "").trim() || null,
        priority: Number(form.get("priority") ?? 0),
      });
      event.currentTarget.reset();
      await refreshDesigner();
      setMessage({ type: "success", text: "ارتباط بین گره‌ها ثبت شد." });
    } catch (e) {
      setMessage({ type: "error", text: apiErrorMessage(e, "ثبت ارتباط انجام نشد.") });
    } finally {
      setTransitionBusy(false);
    }
  }

  async function activate() {
    if (!draft) return;
    setActionBusy("activate");
    setMessage(null);
    try {
      await apiClient.post("/workflows/" + id + "/activate");
      await refreshDesigner();
      setMessage({ type: "success", text: "Workflow با موفقیت فعال شد." });
    } catch (e) {
      setMessage({ type: "error", text: apiErrorMessage(e, "فعال‌سازی Workflow انجام نشد.") });
    } finally {
      setActionBusy(null);
    }
  }

  async function createRevision() {
    setActionBusy("revision");
    setMessage(null);
    try {
      const response = await apiClient.post<WorkflowDefinition>("/workflows/" + id + "/revisions");
      router.replace("/workflows/" + response.data.id);
    } catch (e) {
      setMessage({ type: "error", text: apiErrorMessage(e, "ساخت نسخه جدید انجام نشد.") });
      setActionBusy(null);
    }
  }

  return (
    <DashboardShell>
      <Breadcrumb items={[
        { label: "داشبورد", href: "/dashboard" },
        { label: "مدیریت فرآیندها", href: "/workflows" },
        { label: data?.name ?? "طراح Workflow" },
      ]} />

      {isLoading ? <div className="rounded-xl border bg-card p-8 text-center text-default-500">در حال دریافت Workflow...</div> : null}
      {error ? <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-destructive">دریافت Workflow انجام نشد.</div> : null}

      {data ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-default-900">{data.name}</h1>
                <span className={data.status === WorkflowDefinitionStatus.Active
                  ? "rounded bg-success/10 px-2 py-1 text-xs text-success"
                  : data.status === WorkflowDefinitionStatus.Archived
                    ? "rounded bg-default-100 px-2 py-1 text-xs text-default-500"
                    : "rounded bg-warning/10 px-2 py-1 text-xs text-warning"}>
                  {workflowStatusLabels[data.status]}
                </span>
              </div>
              <p className="mt-1 text-sm text-default-500">نسخه {data.version} — {data.description || "بدون توضیح"}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {draft ? (
                <Button onClick={activate} disabled={actionBusy !== null || data.nodes.length === 0}>
                  {actionBusy === "activate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  فعال‌سازی
                </Button>
              ) : (
                <Button variant="outline" onClick={createRevision} disabled={actionBusy !== null}>
                  {actionBusy === "revision" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                  نسخه جدید
                </Button>
              )}
            </div>
          </div>

          {!draft ? (
            <div className="rounded-md border border-info/20 bg-info/10 p-3 text-sm text-info">
              این نسخه قابل ویرایش نیست. برای تغییر فرآیند، یک Draft Revision جدید بسازید.
            </div>
          ) : null}

          {message ? (
            <div className={message.type === "error"
              ? "rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
              : "rounded-md border border-success/20 bg-success/10 p-3 text-sm text-success"}>
              {message.text}
            </div>
          ) : null}

          <MermaidDiagram workflowId={id} revisionKey={diagramRevision} />

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-xl border bg-card">
              <div className="flex items-center gap-2 border-b px-5 py-4">
                <Layers3 className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="font-semibold text-default-800">گره‌های فرآیند</h2>
                  <p className="mt-1 text-xs text-default-500">Process / Condition / Decision / SubProcess</p>
                </div>
              </div>
              <div className="space-y-2 p-5">
                {data.nodes.slice().sort((a, b) => a.sortOrder - b.sortOrder).map((node) => (
                  <div key={node.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-default-800">{node.name}</div>
                        <div className="mt-1 text-xs text-default-500">
                          {node.key} · {workflowNodeTypeLabels[node.type]}{node.assignedRole ? " · " + node.assignedRole : ""}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {node.isStart ? <span className="rounded bg-success/10 px-2 py-1 text-xs text-success">شروع</span> : null}
                        {node.allowBacktrack ? <span className="rounded bg-info/10 px-2 py-1 text-xs text-info">بازگشت مجاز</span> : null}
                      </div>
                    </div>
                  </div>
                ))}
                {data.nodes.length === 0 ? <div className="py-8 text-center text-sm text-default-500">هنوز گرهی تعریف نشده است.</div> : null}
              </div>
            </section>

            <section className="rounded-xl border bg-card">
              <div className="flex items-center gap-2 border-b px-5 py-4">
                <ArrowLeftRight className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="font-semibold text-default-800">اتصال‌های فرآیند</h2>
                  <p className="mt-1 text-xs text-default-500">مسیر حرکت بین گره‌ها و Outcomeها</p>
                </div>
              </div>
              <div className="space-y-2 p-5">
                {data.transitions.slice().sort((a, b) => a.priority - b.priority).map((transition) => {
                  const from = data.nodes.find((node) => node.id === transition.fromNodeId);
                  const to = data.nodes.find((node) => node.id === transition.toNodeId);
                  return (
                    <div key={transition.id} className="rounded-lg border p-3 text-sm">
                      <div className="flex items-center gap-2 text-default-700">
                        <span>{from?.name ?? "?"}</span>
                        <span className="text-primary">←</span>
                        <span>{to?.name ?? "?"}</span>
                      </div>
                      <div className="mt-1 text-xs text-default-500">
                        {transition.name || "بدون عنوان"}
                        {transition.outcome ? " · Outcome: " + transition.outcome : ""}
                        {" · اولویت " + transition.priority}
                      </div>
                    </div>
                  );
                })}
                {data.transitions.length === 0 ? <div className="py-8 text-center text-sm text-default-500">هنوز ارتباطی تعریف نشده است.</div> : null}
              </div>
            </section>
          </div>

          {draft ? (
            <div className="grid gap-6 xl:grid-cols-2">
              <form onSubmit={addNode} className="rounded-xl border bg-card p-5">
                <div className="mb-5 flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold text-default-800">افزودن گره</h2>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="node-key" className="mb-2 text-default-600">کلید *</Label>
                    <Input id="node-key" name="key" dir="ltr" required />
                  </div>
                  <div>
                    <Label htmlFor="node-name" className="mb-2 text-default-600">عنوان *</Label>
                    <Input id="node-name" name="name" required />
                  </div>
                  <div>
                    <Label className="mb-2 text-default-600">نوع گره *</Label>
                    <select value={nodeType} onChange={(event) => setNodeType(Number(event.target.value) as WorkflowNodeType)} className="h-10 w-full rounded-md border border-default-300 bg-background px-3 text-sm">
                      {Object.entries(workflowNodeTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="sortOrder" className="mb-2 text-default-600">ترتیب</Label>
                    <Input id="sortOrder" name="sortOrder" type="number" min="0" defaultValue={data.nodes.length + 1} />
                  </div>
                  <div>
                    <Label className="mb-2 text-default-600">نقش مسئول</Label>
                    <select name="assignedRole" className="h-10 w-full rounded-md border border-default-300 bg-background px-3 text-sm">
                      <option value="">بدون نقش مشخص</option>
                      {(roles ?? []).map((role) => <option key={role.id} value={role.name}>{role.name}</option>)}
                    </select>
                  </div>

                  {nodeType === WorkflowNodeType.Decision ? (
                    <div>
                      <Label htmlFor="decisionKey" className="mb-2 text-default-600">Decision Key *</Label>
                      <Input id="decisionKey" name="decisionKey" dir="ltr" required />
                    </div>
                  ) : null}

                  {nodeType === WorkflowNodeType.SubProcess ? (
                    <div>
                      <Label className="mb-2 text-default-600">Sub Workflow *</Label>
                      <select name="subWorkflowDefinitionId" required className="h-10 w-full rounded-md border border-default-300 bg-background px-3 text-sm">
                        <option value="">انتخاب Workflow فعال</option>
                        {subprocessOptions.map((workflow) => <option key={workflow.id} value={workflow.id}>{workflow.name} - v{workflow.version}</option>)}
                      </select>
                    </div>
                  ) : null}

                  <div className="md:col-span-2">
                    <Label htmlFor="description" className="mb-2 text-default-600">توضیح</Label>
                    <Input id="description" name="description" />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="metadataJson" className="mb-2 text-default-600">Metadata JSON</Label>
                    <textarea id="metadataJson" name="metadataJson" dir="ltr" rows={3} placeholder='{"approvalGuards":["..."]}' className="w-full rounded-md border border-default-300 bg-background px-3 py-2 font-mono text-sm focus:border-primary focus:outline-none" />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-5">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-default-700">
                    <Switch checked={isStart} onCheckedChange={setIsStart} />
                    گره شروع
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-default-700">
                    <Switch checked={allowBacktrack} onCheckedChange={setAllowBacktrack} />
                    امکان بازگشت
                  </label>
                </div>

                <div className="mt-5 flex justify-end">
                  <Button disabled={nodeBusy}>
                    {nodeBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    افزودن گره
                  </Button>
                </div>
              </form>

              <form onSubmit={addTransition} className="rounded-xl border bg-card p-5">
                <div className="mb-5 flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold text-default-800">اتصال گره‌ها</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="mb-2 text-default-600">از گره *</Label>
                    <select name="fromNodeId" required className="h-10 w-full rounded-md border border-default-300 bg-background px-3 text-sm">
                      <option value="">انتخاب گره مبدا</option>
                      {data.nodes.map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="mb-2 text-default-600">به گره *</Label>
                    <select name="toNodeId" required className="h-10 w-full rounded-md border border-default-300 bg-background px-3 text-sm">
                      <option value="">انتخاب گره مقصد</option>
                      {data.nodes.map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="transition-name" className="mb-2 text-default-600">عنوان مسیر</Label>
                    <Input id="transition-name" name="name" />
                  </div>
                  <div>
                    <Label htmlFor="outcome" className="mb-2 text-default-600">Outcome</Label>
                    <Input id="outcome" name="outcome" dir="ltr" placeholder="Approved / Rejected / Yes / No" />
                  </div>
                  <div>
                    <Label htmlFor="priority" className="mb-2 text-default-600">اولویت</Label>
                    <Input id="priority" name="priority" type="number" min="0" defaultValue="0" />
                  </div>
                </div>

                <div className="mt-5 flex justify-end">
                  <Button disabled={transitionBusy || data.nodes.length < 2}>
                    {transitionBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeftRight className="h-4 w-4" />}
                    ثبت اتصال
                  </Button>
                </div>
              </form>
            </div>
          ) : null}
        </div>
      ) : null}
    </DashboardShell>
  );
}

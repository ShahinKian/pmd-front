"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { ReactFlowProvider } from "@xyflow/react";
import {
  CheckCircle2,
  GitBranch,
  Loader2,
  RefreshCcw,
  Workflow as WorkflowIcon,
} from "lucide-react";
import DashboardShell, { Breadcrumb } from "@/components/layout/dashboard-shell";
import MermaidDiagram from "@/components/workflows/mermaid-diagram";
import WorkflowCanvas from "@/components/workflows/workflow-canvas";
import { Button } from "@/components/ui/button";
import { apiClient, apiErrorMessage } from "@/lib/http/client";
import type { RoleResponse } from "@/lib/auth/types";
import {
  WorkflowDefinitionStatus,
  workflowStatusLabels,
  type WorkflowDefinition,
} from "@/lib/workflows/types";

type DesignerTab = "designer" | "mermaid";

export default function WorkflowDesignerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, error, isLoading, mutate } = useSWR<WorkflowDefinition>(
    id ? "/workflows/" + id : null,
  );
  const { data: roles } = useSWR<RoleResponse[]>("/auth/roles");
  const { data: definitions } = useSWR<WorkflowDefinition[]>("/workflows");

  const [tab, setTab] = useState<DesignerTab>("designer");
  const [actionBusy, setActionBusy] = useState<"activate" | "revision" | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [diagramRevision, setDiagramRevision] = useState(0);

  const draft = data?.status === WorkflowDefinitionStatus.Draft;

  async function changed() {
    await mutate();
    setDiagramRevision((value) => value + 1);
  }

  async function activate() {
    if (!draft || !data) return;
    setActionBusy("activate");
    setMessage(null);
    try {
      await apiClient.post("/workflows/" + id + "/activate");
      await changed();
      setMessage({ type: "success", text: "Workflow با موفقیت فعال شد." });
    } catch (e) {
      setMessage({ type: "error", text: apiErrorMessage(e, "فعال‌سازی Workflow انجام نشد.") });
    } finally {
      setActionBusy(null);
    }
  }

  async function createRevision() {
    if (!data) return;
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
      <Breadcrumb
        items={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "مدیریت فرآیندها", href: "/workflows" },
          { label: data?.name ?? "طراح Workflow" },
        ]}
      />

      {isLoading ? (
        <div className="rounded-xl border bg-card p-8 text-center text-default-500">
          در حال دریافت Workflow...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-destructive">
          دریافت Workflow انجام نشد.
        </div>
      ) : null}

      {data ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold text-default-900">{data.name}</h1>
                <span
                  className={
                    data.status === WorkflowDefinitionStatus.Active
                      ? "rounded bg-success/10 px-2 py-1 text-xs text-success"
                      : data.status === WorkflowDefinitionStatus.Archived
                        ? "rounded bg-default-100 px-2 py-1 text-xs text-default-500"
                        : "rounded bg-warning/10 px-2 py-1 text-xs text-warning"
                  }
                >
                  {workflowStatusLabels[data.status]}
                </span>
              </div>
              <p className="mt-1 text-sm text-default-500">
                نسخه {data.version} · {data.nodes.length} مرحله · {data.transitions.length} اتصال
              </p>
              {data.description ? (
                <p className="mt-2 max-w-3xl text-sm leading-6 text-default-600">{data.description}</p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              {draft ? (
                <Button
                  onClick={activate}
                  disabled={actionBusy !== null || data.nodes.length === 0}
                >
                  {actionBusy === "activate" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  فعال‌سازی نسخه
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={createRevision}
                  disabled={actionBusy !== null}
                >
                  {actionBusy === "revision" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCcw className="h-4 w-4" />
                  )}
                  ساخت نسخه قابل ویرایش
                </Button>
              )}
            </div>
          </div>

          {message ? (
            <div
              className={
                message.type === "error"
                  ? "rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
                  : "rounded-md border border-success/20 bg-success/10 p-3 text-sm text-success"
              }
            >
              {message.text}
            </div>
          ) : null}

          <div className="flex w-fit gap-1 rounded-xl border bg-card p-1">
            <button
              type="button"
              onClick={() => setTab("designer")}
              className={
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition " +
                (tab === "designer"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-default-600 hover:bg-default-100")
              }
            >
              <WorkflowIcon className="h-4 w-4" />
              طراح Drag & Drop
            </button>
            <button
              type="button"
              onClick={() => setTab("mermaid")}
              className={
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition " +
                (tab === "mermaid"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-default-600 hover:bg-default-100")
              }
            >
              <GitBranch className="h-4 w-4" />
              پیش‌نمایش Mermaid
            </button>
          </div>

          {tab === "designer" ? (
            <ReactFlowProvider>
              <WorkflowCanvas
                definition={data}
                roles={roles ?? []}
                definitions={definitions ?? []}
                draft={draft}
                onChanged={changed}
              />
            </ReactFlowProvider>
          ) : (
            <MermaidDiagram workflowId={id} revisionKey={diagramRevision} />
          )}

          <div className="rounded-xl border bg-card p-4 text-xs leading-6 text-default-500">
            {draft
              ? "در نسخه Draft می‌توانی مرحله‌ها را Drag کنی، اتصال جدید بسازی، Properties را ویرایش کنی و مرحله/اتصال را حذف کنی. موقعیت مرحله پس از پایان Drag ذخیره می‌شود."
              : "نسخه Active قفل است. برای تغییر ساختار، ابتدا «ساخت نسخه قابل ویرایش» را بزن؛ نسخه جاری برای اجرای فرآیند بدون تغییر باقی می‌ماند."}
          </div>
        </div>
      ) : null}
    </DashboardShell>
  );
}

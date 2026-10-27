"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { GitBranch, Loader2, Plus, Settings2, WandSparkles } from "lucide-react";
import DashboardShell, { Breadcrumb } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StatusAlert from "@/components/ui/status-alert";
import { useSession } from "@/hooks/use-session";
import { apiClient, apiErrorMessage } from "@/lib/http/client";
import {
  workflowStatusLabels,
  WorkflowDefinitionStatus,
  type WorkflowDefinition,
} from "@/lib/workflows/types";
import {
  createForecastWorkflowSample,
  createProgramProfileWorkflowSample,
  createProgramProfileNoCodeSample,
  programProfileNoCodeSampleName,
  forecastWorkflowSampleName,
  programProfileWorkflowSampleName,
} from "@/lib/workflows/samples";

export default function WorkflowsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { data, error, isLoading, mutate } = useSWR<WorkflowDefinition[]>("/workflows");
  const [creating, setCreating] = useState(false);
  const [creatingSample, setCreatingSample] = useState<"forecast" | "program-profile" | null>(null);
  const [message, setMessage] = useState("");

  async function createWorkflow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await apiClient.post<WorkflowDefinition>("/workflows", {
        name: String(form.get("name") ?? "").trim(),
        description: String(form.get("description") ?? "").trim() || null,
      });
      await mutate((current) => [response.data, ...(current ?? [])], false);
      event.currentTarget.reset();
    } catch (e) {
      setMessage(apiErrorMessage(e, "ایجاد فرآیند انجام نشد."));
    } finally {
      setCreating(false);
    }
  }

  async function openOrCreateSample(
    kind: "forecast" | "program-profile",
    sampleName: string,
    factory: () => Promise<WorkflowDefinition>,
  ) {
    const existing = (data ?? []).find((item) => item.name === sampleName);
    if (existing) {
      router.push("/workflows/" + existing.id);
      return;
    }

    setCreatingSample(kind);
    setMessage("");

    try {
      const definition = await factory();
      await mutate();
      router.push("/workflows/" + definition.id);
    } catch (e) {
      setMessage(
        apiErrorMessage(
          e,
          kind === "forecast"
            ? "ساخت نمونه فرآیند پیش‌بینی انجام نشد."
            : "ساخت نمونه فرآیند شناسنامه برنامه انجام نشد.",
        ),
      );
      await mutate();
    } finally {
      setCreatingSample(null);
    }
  }

  return (
    <DashboardShell>
      <Breadcrumb items={[{ label: "داشبورد", href: "/dashboard" }, { label: "مدیریت فرآیندها" }]} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-default-900">مدیریت Workflow</h1>
          <p className="mt-1 text-sm text-default-500">تعریف فرآیند، نسخه‌بندی، طراحی شماتیک و فعال‌سازی</p>
        </div>
        {session?.isSystemAdmin ? (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() =>
                openOrCreateSample(
                  "forecast",
                  forecastWorkflowSampleName,
                  createForecastWorkflowSample,
                )
              }
              disabled={creatingSample !== null}
            >
              {creatingSample === "forecast" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <WandSparkles className="h-4 w-4" />
              )}
              نمونه فرآیند پیش‌بینی
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                openOrCreateSample(
                  "program-profile",
                  programProfileWorkflowSampleName,
                  createProgramProfileWorkflowSample,
                )
              }
              disabled={creatingSample !== null}
            >
              {creatingSample === "program-profile" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <WandSparkles className="h-4 w-4" />
              )}
              نمونه فرآیند شناسنامه برنامه
            </Button>
            <Button
              variant="outline"
              onClick={() => openOrCreateSample("program-profile", programProfileNoCodeSampleName, createProgramProfileNoCodeSample)}
              disabled={creatingSample !== null}
            >
              {creatingSample === "program-profile" ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
              نمونه جدید شناسنامه (شرط‌گذاری بدون کدنویسی)
            </Button>
            <Button asChild variant="outline">
              <Link href="/workflows/assignments">
                <Settings2 className="h-4 w-4" />
                تخصیص Workflow
              </Link>
            </Button>
          </div>
        ) : null}
      </div>

      {session && !session.isSystemAdmin ? (
        <StatusAlert
          type="warning"
          title="دسترسی محدود"
          message="تعریف و ویرایش Workflow فقط برای مدیر سیستم مجاز است."
          className="mb-5"
        />
      ) : null}

      {session?.isSystemAdmin ? (
        <form onSubmit={createWorkflow} className="mb-6 rounded-xl border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-default-800">Workflow جدید</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_2fr_auto] md:items-end">
            <div>
              <Label htmlFor="name" className="mb-2 text-default-600">نام فرآیند *</Label>
              <Input id="name" name="name" required />
            </div>
            <div>
              <Label htmlFor="description" className="mb-2 text-default-600">توضیح</Label>
              <Input id="description" name="description" />
            </div>
            <Button disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              ایجاد
            </Button>
          </div>
          {message ? (
            <StatusAlert
              type="error"
              title="ایجاد فرآیند انجام نشد"
              message={message}
              dismissible
              onDismiss={() => setMessage("")}
              className="mt-4"
            />
          ) : null}
        </form>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {(data ?? []).map((workflow) => (
          <Link
            key={workflow.id}
            href={`/workflows/${workflow.id}`}
            className="rounded-xl border bg-card p-5 transition hover:border-primary"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <GitBranch className="h-5 w-5" />
              </div>
              <span className={
                workflow.status === WorkflowDefinitionStatus.Active
                  ? "rounded bg-success/10 px-2 py-1 text-xs text-success"
                  : workflow.status === WorkflowDefinitionStatus.Archived
                    ? "rounded bg-default-100 px-2 py-1 text-xs text-default-500"
                    : "rounded bg-warning/10 px-2 py-1 text-xs text-warning"
              }>
                {workflowStatusLabels[workflow.status] ?? workflow.status}
              </span>
            </div>
            <h2 className="mt-4 font-semibold text-default-800">{workflow.name}</h2>
            <p className="mt-2 min-h-10 text-sm leading-6 text-default-500">{workflow.description || "بدون توضیح"}</p>
            <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-default-500">
              <span>نسخه {workflow.version}</span>
              <span>{workflow.nodes.length} گره / {workflow.transitions.length} اتصال</span>
            </div>
          </Link>
        ))}
      </div>

      {isLoading ? <div className="rounded-xl border bg-card p-10 text-center text-default-500">در حال دریافت Workflowها...</div> : null}
      {error ? (
        <StatusAlert
          type="error"
          title="خطا در دریافت فرآیندها"
          message="لیست Workflowها از سرور دریافت نشد. لطفاً اتصال API را بررسی کنید."
        />
      ) : null}
    </DashboardShell>
  );
}

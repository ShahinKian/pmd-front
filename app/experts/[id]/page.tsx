"use client";

import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { Loader2, Trash2 } from "lucide-react";
import DashboardShell, { Breadcrumb } from "@/components/layout/dashboard-shell";
import ExpertForm from "@/components/experts/expert-form";
import { Button } from "@/components/ui/button";
import { apiClient, apiErrorMessage } from "@/lib/http/client";
import type { ExpertResponse } from "@/lib/experts/types";
import { useState } from "react";

export default function ExpertDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, error, isLoading, mutate } = useSWR<ExpertResponse>(id ? `/experts/${id}` : null);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");

  async function remove() {
    if (!window.confirm("کارشناس حذف شود؟")) return;
    setDeleting(true);
    setMessage("");
    try {
      await apiClient.delete(`/experts/${id}`);
      router.replace("/experts");
    } catch (e) {
      setMessage(apiErrorMessage(e, "حذف کارشناس انجام نشد."));
      setDeleting(false);
    }
  }

  return (
    <DashboardShell>
      <Breadcrumb items={[{ label: "داشبورد", href: "/dashboard" }, { label: "کارشناسان", href: "/experts" }, { label: "ویرایش کارشناس" }]} />
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-default-900">ویرایش کارشناس</h1>
          <p className="mt-1 text-sm text-default-500">{data ? `${data.firstName} ${data.lastName}` : "اطلاعات کارشناس"}</p>
        </div>
        <Button color="destructive" onClick={remove} disabled={deleting}>
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          حذف
        </Button>
      </div>
      {isLoading ? <div className="rounded-xl border bg-card p-6 text-default-500">در حال دریافت اطلاعات...</div> : null}
      {error ? <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-destructive">دریافت اطلاعات کارشناس انجام نشد.</div> : null}
      {message ? <div className="mb-4 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-destructive">{message}</div> : null}
      {data ? (
        <div className="rounded-xl border bg-card p-6">
          <ExpertForm expert={data} onSaved={(saved) => mutate(saved, false)} />
        </div>
      ) : null}
    </DashboardShell>
  );
}

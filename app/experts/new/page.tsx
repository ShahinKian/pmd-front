"use client";

import { useRouter } from "next/navigation";
import DashboardShell, { Breadcrumb } from "@/components/layout/dashboard-shell";
import ExpertForm from "@/components/experts/expert-form";

export default function NewExpertPage() {
  const router = useRouter();

  return (
    <DashboardShell>
      <Breadcrumb items={[{ label: "داشبورد", href: "/dashboard" }, { label: "کارشناسان", href: "/experts" }, { label: "کارشناس جدید" }]} />
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-default-900">تعریف کارشناس</h1>
        <p className="mt-1 text-sm text-default-500">اطلاعات تخصصی و شبکه‌های مرتبط با کارشناس را ثبت کنید.</p>
      </div>
      <div className="rounded-xl border bg-card p-6">
        <ExpertForm onSaved={(expert) => router.replace(`/experts/${expert.id}`)} />
      </div>
    </DashboardShell>
  );
}

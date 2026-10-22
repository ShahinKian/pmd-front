"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Plus, Search, UsersRound } from "lucide-react";
import DashboardShell, { Breadcrumb } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StatusAlert from "@/components/ui/status-alert";
import type { BaseInfoListResponse } from "@/lib/base-info/browser-types";
import { educationLevelLabels, type ExpertResponse } from "@/lib/experts/types";

function toPositiveInt(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function ExpertsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [networkId, setNetworkId] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<"" | "true" | "false">("");

  const query = new URLSearchParams();
  if (searchTerm.trim()) query.set("searchTerm", searchTerm.trim());
  if (networkId) query.set("networkId", String(networkId));
  if (activeFilter) query.set("isActive", activeFilter);
  query.set("pageNumber", "1");
  query.set("pageSize", "100");

  const { data, error, isLoading } = useSWR<ExpertResponse[]>(`/experts?${query.toString()}`);
  const { data: networks } = useSWR<BaseInfoListResponse>("/base-info/networks");

  const networkOptions = useMemo(
    () =>
      (networks?.Data ?? [])
        .map((item) => ({ id: toPositiveInt(item.Value), label: item.Text }))
        .filter((item): item is { id: number; label: string } => item.id !== null),
    [networks],
  );

  const networkName = (id: number) =>
    networkOptions.find((item) => item.id === id)?.label ?? `شبکه ${id}`;

  return (
    <DashboardShell>
      <Breadcrumb items={[{ label: "داشبورد", href: "/dashboard" }, { label: "کارشناسان" }]} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-default-900">مدیریت کارشناسان</h1>
          <p className="mt-1 text-sm text-default-500">تعریف، ویرایش و جستجوی کارشناسان تخصصی شبکه‌ها</p>
        </div>
        <Button asChild>
          <Link href="/experts/new" prefetch>
            <Plus className="h-4 w-4" />
            کارشناس جدید
          </Link>
        </Button>
      </div>

      <div className="mb-5 rounded-xl border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-default-400" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="جستجو در نام، تخصص، محل کار..."
              className="pr-9"
            />
          </div>
          <select
            value={networkId ?? ""}
            onChange={(event) => setNetworkId(toPositiveInt(event.target.value))}
            className="h-10 rounded-md border border-default-300 bg-background px-3 text-sm text-default-700 focus:border-primary focus:outline-none"
          >
            <option value="">همه شبکه‌ها</option>
            {networkOptions.map((network) => (
              <option key={network.id} value={network.id}>{network.label}</option>
            ))}
          </select>
          <select
            value={activeFilter}
            onChange={(event) => setActiveFilter(event.target.value as "" | "true" | "false")}
            className="h-10 rounded-md border border-default-300 bg-background px-3 text-sm text-default-700 focus:border-primary focus:outline-none"
          >
            <option value="">همه وضعیت‌ها</option>
            <option value="true">فعال</option>
            <option value="false">غیرفعال</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-default-50">
            <tr>
              <th className="px-4 py-3 text-right">کارشناس</th>
              <th className="px-4 py-3 text-right">تخصص</th>
              <th className="px-4 py-3 text-right">تحصیلات</th>
              <th className="px-4 py-3 text-right">شبکه‌ها</th>
              <th className="px-4 py-3 text-right">تماس</th>
              <th className="px-4 py-3 text-right">وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((expert) => (
              <tr key={expert.id} className="border-t hover:bg-default-50">
                <td className="px-4 py-3">
                  <Link href={`/experts/${expert.id}`} className="font-medium text-primary">
                    {expert.firstName} {expert.lastName}
                  </Link>
                  <div className="mt-1 text-xs text-default-500">{expert.workplace}</div>
                </td>
                <td className="px-4 py-3 text-default-700">{expert.specialty}</td>
                <td className="px-4 py-3 text-default-600">{educationLevelLabels[expert.education] ?? expert.education}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {expert.networkIds.map((id) => (
                      <span key={id} className="rounded bg-primary/10 px-2 py-1 text-xs text-primary">
                        {networkName(id)}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-default-600" dir="ltr">{expert.mobilePhone}</td>
                <td className="px-4 py-3">
                  <span className={expert.isActive ? "text-success" : "text-destructive"}>
                    {expert.isActive ? "فعال" : "غیرفعال"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {isLoading ? <div className="p-10 text-center text-default-500">در حال دریافت کارشناسان...</div> : null}
        {error ? (
          <div className="p-4">
            <StatusAlert
              type="error"
              title="دریافت کارشناسان ناموفق بود"
              message="لیست کارشناسان از سرور دریافت نشد. فیلترها یا اتصال API را بررسی کنید."
            />
          </div>
        ) : null}
        {!isLoading && !error && (data?.length ?? 0) === 0 ? (
          <div className="p-10 text-center text-default-500">
            <UsersRound className="mx-auto mb-3 h-8 w-8" />
            کارشناس مطابق فیلتر انتخابی پیدا نشد.
          </div>
        ) : null}
      </div>
    </DashboardShell>
  );
}

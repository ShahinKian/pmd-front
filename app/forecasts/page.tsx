"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { Filter, Plus, RefreshCcw } from "lucide-react";
import DashboardShell, { Breadcrumb } from "@/components/layout/dashboard-shell";
import { apiClient } from "@/lib/http/client";
import { useSession } from "@/hooks/use-session";
import {
  FORECAST_STATUS,
  forecastStatusLabel,
  type ForecastResponse,
  type PaginationMeta,
} from "@/lib/forecasts/types";
import { PersianDatePicker } from "@/components/ui/persian-date-picker";

interface ForecastListPayload {
  items: ForecastResponse[];
  pagination: PaginationMeta | null;
}

async function forecastListFetcher(url: string): Promise<ForecastListPayload> {
  const response = await apiClient.get<ForecastResponse[]>(url);
  const raw = response.headers.pagination as string | undefined;
  let pagination: PaginationMeta | null = null;
  if (raw) {
    try { pagination = JSON.parse(raw) as PaginationMeta; } catch { pagination = null; }
  }
  return { items: response.data, pagination };
}

function formatPersianDate(value: string): string {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(value));
}

function ProgramNameCell({ forecast }: { forecast: ForecastResponse }) {
  const { data } = useSWR<{ Data?: Array<{ Value: string; Text: string }> }>(
    forecast.planName ? null : `/base-info/plans/${forecast.networkId}?networkGroupId=${forecast.networkGroupId}`,
  );
  const name = forecast.planName || data?.Data?.find((plan) => Number(plan.Value) === forecast.planId)?.Text;
  return <>{name || "در حال دریافت نام برنامه..."}</>;
}

export default function ForecastsPage() {
  const {data:session}=useSession();
  const isStarter = session?.user.roles.includes("Providers") ?? false;
  const [status, setStatus] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (fromDate) params.set("fromDate", `${fromDate}T00:00:00`);
    if (toDate) params.set("toDate", `${toDate}T23:59:59`);
    params.set("pageNumber", String(page));
    params.set("pageSize", "20");
    return "/forecasts?" + params.toString();
  }, [status, fromDate, toDate, page]);

  const { data, error, isLoading, mutate } =
    useSWR<ForecastListPayload>(query, forecastListFetcher);

  function resetFilters() {
    setStatus(""); setFromDate(""); setToDate(""); setPage(1);
  }

  return (
    <DashboardShell>
      <Breadcrumb items={[{ label: "داشبورد", href: "/dashboard" }, { label: "پیش‌بینی برنامه" }]} />

      <div className="page-head">
        <div>
          <h1 className="page-title">پیش‌بینی برنامه</h1>
          <p className="page-description">ثبت، پیگیری و مدیریت گردش‌کار پیش‌بینی‌های برنامه</p>
        </div>
        {isStarter ? (
          <Link href="/forecasts/new" className="btn btn-primary">
            <Plus size={17} />پیش‌بینی جدید
          </Link>
        ) : null}
      </div>

      <section className="form-section" style={{ marginBottom: 18 }}>
        <div className="form-section-head">
          <div><strong>فیلتر پیش‌بینی‌ها</strong><div className="section-kicker">تاریخ‌ها به‌صورت شمسی انتخاب می‌شوند.</div></div>
        </div>
        <div className="form-section-body">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="field">
              <span className="label">وضعیت</span>
              <select className="select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
                <option value="">همه وضعیت‌ها</option>
                {Object.values(FORECAST_STATUS).map((value) => <option key={value} value={value}>{forecastStatusLabel(value)}</option>)}
              </select>
            </label>
            <div className="field"><span className="label">از تاریخ</span><PersianDatePicker value={fromDate} onChange={(value) => { setFromDate(value); setPage(1); }} /></div>
            <div className="field"><span className="label">تا تاریخ</span><PersianDatePicker value={toDate} onChange={(value) => { setToDate(value); setPage(1); }} /></div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button type="button" className="btn btn-outline" onClick={resetFilters}><Filter size={16} />پاک‌کردن فیلترها</button>
            <button type="button" className="btn btn-outline" onClick={() => mutate()}><RefreshCcw size={16} />بازخوانی</button>
          </div>
        </div>
      </section>

      <section className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead style={{ background: "#f8fafc" }}>
            <tr>
              <th style={{ padding: 12, textAlign: "right" }}>موضوع</th>
              <th style={{ padding: 12, textAlign: "right" }}>برنامه</th>
              <th style={{ padding: 12, textAlign: "right" }}>قسمت</th>
              <th style={{ padding: 12, textAlign: "right" }}>تاریخ پخش</th>
              <th style={{ padding: 12, textAlign: "right" }}>ثبت‌کننده</th>
              <th style={{ padding: 12, textAlign: "right" }}>وضعیت</th>
              <th style={{ padding: 12, textAlign: "right" }}>مرحله گردش‌کار</th>
              <th style={{ padding: 12, textAlign: "right" }}>عملیات</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((item) => {
              const approved = item.status === FORECAST_STATUS.Approved;
              const hasProfileHighlight = isStarter && item.hasProfile;
              return (
                <tr key={item.id} className={hasProfileHighlight ? "bg-amber-50/80" : ""} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: 12, fontWeight: 700 }}>{item.mainTopic}</td>
                  <td style={{ padding: 12 }}><ProgramNameCell forecast={item} /></td>
                  <td style={{ padding: 12 }}>{item.episodeNumber}</td>
                  <td style={{ padding: 12 }}>{formatPersianDate(item.broadcastDate)}</td>
                  <td style={{ padding: 12 }}>{item.userCreatorName || "—"}</td>
                  <td style={{ padding: 12 }}>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${approved ? "bg-green-100 text-green-700" : "bg-default-100 text-default-700"}`}>
                      {forecastStatusLabel(item.status)}
                    </span>
                    {hasProfileHighlight ? <span className="mr-2 rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-800">شناسنامه ثبت شده</span> : null}
                  </td>
                  <td style={{ padding: 12 }}>{item.workflow ? <><strong>{item.workflow.workflowName}</strong><div className="muted">{item.workflow.currentNodeName || "پایان فرآیند"}</div></> : "—"}</td>
                  <td style={{ padding: 12 }}><Link className="btn btn-outline" href={"/forecasts/" + item.id}>مشاهده</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {!isLoading && !error && (data?.items.length ?? 0) === 0 ? <div style={{ padding: 30, textAlign: "center" }} className="muted">موردی برای نمایش وجود ندارد.</div> : null}
        {isLoading ? <div style={{ padding: 24 }} className="muted">در حال دریافت اطلاعات...</div> : null}
        {error ? <div className="alert alert-error" style={{ margin: 16 }}>دریافت پیش‌بینی‌ها انجام نشد.</div> : null}
      </section>

      {data?.pagination ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
          <span className="muted" style={{ fontSize: 12 }}>
            صفحه {data.pagination.PageNumber} از {data.pagination.TotalPages} — {data.pagination.TotalCount} رکورد
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-outline" disabled={!data.pagination.HasPrevious} onClick={() => setPage((value) => Math.max(1, value - 1))}>قبلی</button>
            <button className="btn btn-outline" disabled={!data.pagination.HasNext} onClick={() => setPage((value) => value + 1)}>بعدی</button>
          </div>
        </div>
      ) : null}
    </DashboardShell>
  );
}

"use client";

import { FormEvent, useMemo, useState } from "react";
import useSWR from "swr";
import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import DashboardShell, { Breadcrumb } from "@/components/layout/dashboard-shell";
import { apiClient, apiErrorMessage } from "@/lib/http/client";
import { useSession } from "@/hooks/use-session";
import type { BaseInfoListResponse } from "@/lib/base-info/browser-types";
import type { PlanProviderLink } from "@/lib/plan-providers/types";

interface ExpertItem {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string;
}

function toPositiveInt(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function NewForecastPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isProvider = session?.user.roles.includes("Providers") ?? false;

  const { data: networks } = useSWR<BaseInfoListResponse>("/base-info/networks");
  const { data: experts } = useSWR<ExpertItem[]>("/experts?pageNumber=1&pageSize=100&isActive=true");
  const { data: myPlanLinks } = useSWR<PlanProviderLink[]>(
    isProvider ? "/plan-providers/my/plans" : null,
  );

  const [networkId, setNetworkId] = useState<number | null>(null);
  const [networkGroupId, setNetworkGroupId] = useState<number | null>(null);
  const [planId, setPlanId] = useState<number | null>(null);
  const [hasExpert, setHasExpert] = useState(false);
  const [selectedExpertIds, setSelectedExpertIds] = useState<string[]>([]);
  const [topicAxes, setTopicAxes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const { data: groups } = useSWR<BaseInfoListResponse>(
    networkId ? "/base-info/network-groups/" + networkId : null,
  );
  const { data: plans } = useSWR<BaseInfoListResponse>(
    networkId ? "/base-info/plans/" + networkId : null,
  );
  const { data: episode } = useSWR<{ episodeNumber: number }>(
    planId ? "/forecasts/next-episode-number/" + planId : null,
  );

  const networkOptions = useMemo(() => {
    const all = (networks?.Data ?? [])
      .map((item) => ({ id: toPositiveInt(item.Value), label: item.Text }))
      .filter((item): item is { id: number; label: string } => item.id !== null);

    if (session?.isSystemAdmin || isProvider) return all;

    const allowed = new Set(session?.user.networkIds ?? []);
    return all.filter((item) => allowed.has(item.id));
  }, [networks, session, isProvider]);

  const planOptions = useMemo(() => {
    const all = (plans?.Data ?? [])
      .map((item) => ({ id: toPositiveInt(item.Value), label: item.Text }))
      .filter((item): item is { id: number; label: string } => item.id !== null);

    if (!isProvider) return all;

    const allowed = new Set((myPlanLinks ?? []).map((item) => item.planId));
    return all.filter((item) => allowed.has(item.id));
  }, [plans, isProvider, myPlanLinks]);

  function changeNetwork(value: string) {
    setNetworkId(toPositiveInt(value));
    setNetworkGroupId(null);
    setPlanId(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!networkId || !networkGroupId || !planId) {
      setMessage("شبکه، گروه برنامه‌ساز و طرح الزامی هستند.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const broadcastDate = String(form.get("broadcastDate") ?? "");
    const mainTopic = String(form.get("mainTopic") ?? "").trim();

    if (!broadcastDate || !mainTopic) {
      setMessage("موضوع و تاریخ پخش الزامی هستند.");
      return;
    }

    setSaving(true);
    try {
      const response = await apiClient.post("/forecasts", {
        planId,
        episodeNumber: episode?.episodeNumber ?? 1,
        networkId,
        networkGroupId,
        broadcastDate: new Date(broadcastDate).toISOString(),
        mainTopic,
        hasExpert,
        topicAxes: topicAxes
          .split(/\r?\n/)
          .map((item) => item.trim())
          .filter(Boolean),
        expertIds: hasExpert ? selectedExpertIds : [],
      });

      router.replace("/forecasts/" + response.data.id);
      router.refresh();
    } catch (error) {
      setMessage(apiErrorMessage(error, "ثبت پیش‌بینی انجام نشد."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell>
      <Breadcrumb
        items={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "پیش‌بینی برنامه", href: "/forecasts" },
          { label: "ثبت پیش‌بینی" },
        ]}
      />

      <div className="page-head">
        <div>
          <h1 className="page-title">ثبت پیش‌بینی جدید</h1>
          <p className="page-description">
            اطلاعات پایه از سرویس مرجع و گردش‌کار از pmd-api دریافت می‌شود.
          </p>
        </div>
      </div>

      <form className="card" onSubmit={submit}>
        <div className="form-grid">
          <label className="field">
            <span className="label">شبکه *</span>
            <select className="select" value={networkId ?? ""} onChange={(e) => changeNetwork(e.target.value)} required>
              <option value="">انتخاب شبکه</option>
              {networkOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>

          <label className="field">
            <span className="label">گروه برنامه‌ساز *</span>
            <select
              className="select"
              value={networkGroupId ?? ""}
              onChange={(e) => setNetworkGroupId(toPositiveInt(e.target.value))}
              disabled={!networkId}
              required
            >
              <option value="">انتخاب گروه</option>
              {(groups?.Data ?? []).map((item) => {
                const id = toPositiveInt(item.Value);
                return id ? <option key={id} value={id}>{item.Text}</option> : null;
              })}
            </select>
          </label>

          <label className="field">
            <span className="label">طرح *</span>
            <select
              className="select"
              value={planId ?? ""}
              onChange={(e) => setPlanId(toPositiveInt(e.target.value))}
              disabled={!networkId}
              required
            >
              <option value="">انتخاب طرح</option>
              {planOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            {isProvider ? (
              <small className="muted">فقط طرح‌های متصل به providerId کاربر در PlanProvider قابل انتخاب هستند.</small>
            ) : null}
          </label>

          <label className="field">
            <span className="label">شماره قسمت بعدی</span>
            <input className="input" readOnly value={episode?.episodeNumber ?? ""} />
            <small className="muted">پیش‌نمایش است؛ شماره نهایی را بک‌اند هنگام ثبت محاسبه می‌کند.</small>
          </label>

          <label className="field">
            <span className="label">تاریخ و ساعت پخش *</span>
            <input className="input" name="broadcastDate" type="datetime-local" required />
          </label>

          <label className="field">
            <span className="label">موضوع اصلی *</span>
            <input className="input" name="mainTopic" required />
          </label>

          <label className="field full">
            <span className="label">محورهای موضوعی</span>
            <textarea
              className="input"
              style={{ height: 110, paddingTop: 10 }}
              value={topicAxes}
              onChange={(e) => setTopicAxes(e.target.value)}
              placeholder="هر محور در یک خط"
            />
          </label>

          <label className="check-card">
            <input
              type="checkbox"
              checked={hasExpert}
              onChange={(e) => {
                setHasExpert(e.target.checked);
                if (!e.target.checked) setSelectedExpertIds([]);
              }}
            />
            <span>برنامه دارای کارشناس است</span>
          </label>

          {hasExpert ? (
            <div className="field full">
              <span className="label">کارشناسان</span>
              <div className="checkbox-row">
                {(experts ?? []).map((expert) => (
                  <label className="check-card" key={expert.id}>
                    <input
                      type="checkbox"
                      checked={selectedExpertIds.includes(expert.id)}
                      onChange={() =>
                        setSelectedExpertIds((current) =>
                          current.includes(expert.id)
                            ? current.filter((id) => id !== expert.id)
                            : [...current, expert.id],
                        )
                      }
                    />
                    <span>{expert.firstName} {expert.lastName}</span>
                    <small className="muted">{expert.specialty}</small>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {message ? <div className="alert alert-error" style={{ marginTop: 16 }}>{message}</div> : null}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
          <button className="btn btn-primary" disabled={saving}>
            {saving ? <Loader2 size={17} /> : <Save size={17} />}
            ثبت پیش‌بینی
          </button>
        </div>
      </form>
    </DashboardShell>
  );
}

"use client";

import { useNetworkScope } from "@/hooks/use-network-scope";
import { NetworkSelect } from "@/components/ui/network-field";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { FormEvent, useMemo, useState } from "react";
import useSWR from "swr";
import { Loader2, Save, CalendarDays, Layers3, UserRoundSearch } from "lucide-react";
import { useRouter } from "next/navigation";
import DashboardShell, { Breadcrumb } from "@/components/layout/dashboard-shell";
import { apiClient, apiErrorMessage } from "@/lib/http/client";
import { useSession } from "@/hooks/use-session";
import type { BaseInfoListResponse } from "@/lib/base-info/browser-types";
import type { EnrichedProviderPlan } from "@/lib/plan-providers/types";
import { ProgramAssignmentFields } from "@/components/plan-providers/program-assignment-fields";
import { PersianDatePicker } from "@/components/ui/persian-date-picker";
import { Switch } from "@/components/ui/switch";
import { TopicAxesEditor } from "@/components/forecasts/topic-axes-editor";
import {
  ExpertSelector,
  type ExpertOption,
} from "@/components/forecasts/expert-selector";

function toPositiveInt(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function NewForecastPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isProvider = session?.user.roles.includes("Providers") ?? false;

  const { data: myPlans, isLoading: myPlansLoading, error: myPlansError, mutate: reloadMyPlans } = useSWR<EnrichedProviderPlan[]>(
    isProvider ? "/plan-providers/my/plans/enriched" : null,
  );
  const { data: networks } = useSWR<BaseInfoListResponse>(isProvider ? "/base-info/networks" : null);

  const [selectedNetwork, setNetworkId] = useState<number | null>(null);
  const networkScope = useNetworkScope(isProvider ? undefined : session, selectedNetwork?.toString());
  const [selectedGroupId, setNetworkGroupId] = useState<number | null>(null);
  const [planId, setPlanId] = useState<number | null>(null);
  const selectedPlan = myPlans?.find(plan => plan.planId === planId);
  const networkId = isProvider ? selectedPlan?.networkId ?? null : toPositiveInt(networkScope.networkId);
  const networkGroupId = isProvider ? selectedPlan?.networkGroupId ?? null : selectedGroupId;
  const [broadcastDate, setBroadcastDate] = useState("");
  const [hasExpert, setHasExpert] = useState(false);
  const [selectedExpertIds, setSelectedExpertIds] = useState<string[]>([]);
  const [topicAxes, setTopicAxes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const { data: groups } = useSWR<BaseInfoListResponse>(
    networkId ? `/base-info/network-groups/${networkId}` : null,
  );
  const { data: plans, isLoading: plansLoading, error: plansError } = useSWR<BaseInfoListResponse>(
    !isProvider && networkId && networkGroupId
      ? `/base-info/plans/${networkId}?networkGroupId=${networkGroupId}`
      : null,
  );
  const { data: episode, error: episodeError, isLoading: episodeLoading, mutate: reloadEpisode } = useSWR<{ episodeNumber: number }>(
    planId ? `/forecasts/next-episode-number/${planId}` : null,
  );
  const { data: experts } = useSWR<ExpertOption[]>(
    hasExpert && networkId
      ? `/experts?pageNumber=1&pageSize=100&isActive=true&networkId=${networkId}`
      : null,
  );


  const planOptions = useMemo(() => {
    const all = (plans?.Data ?? [])
      .map((item) => ({ id: toPositiveInt(item.Value), label: item.Text }))
      .filter((item): item is { id: number; label: string } => item.id !== null);

    return all;
  }, [plans]);

  function changePlan(value: string) {
    setPlanId(toPositiveInt(value));
    setSelectedExpertIds([]);
  }

  function changeGroup(value: string) {
    setNetworkGroupId(toPositiveInt(value));
    setPlanId(null);
  }

  function changeNetwork(value: string) {
    setNetworkId(toPositiveInt(value));
    setNetworkGroupId(null);
    setPlanId(null);
    setSelectedExpertIds([]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!networkId || !networkGroupId || !planId) {
      setMessage("شبکه، گروه برنامه‌ساز و طرح الزامی هستند.");
      return;
    }
    if (episodeError || !episode || !Number.isSafeInteger(episode.episodeNumber) || episode.episodeNumber < 1) {
      setMessage("شماره قسمت برنامه هنوز دریافت نشده است. دوباره تلاش کنید.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const mainTopic = String(form.get("mainTopic") ?? "").trim();

    if (!broadcastDate || !mainTopic) {
      setMessage("موضوع و تاریخ پخش الزامی هستند.");
      return;
    }

    setSaving(true);
    try {
      const response = await apiClient.post("/forecasts", {
        planId,
        episodeNumber: episode.episodeNumber,
        networkId,
        networkGroupId,
        broadcastDate: `${broadcastDate}T00:00:00`,
        mainTopic,
        hasExpert,
        topicAxes,
        expertIds: hasExpert ? selectedExpertIds : [],
      });

      router.replace("/forecasts/" + response.data.id);
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
            اطلاعات برنامه را مرحله‌به‌مرحله و بر اساس طرح انتخابی ثبت کنید.
          </p>
        </div>
      </div>

      <form className="grid" style={{ gap: 18 }} onSubmit={submit}>
        <section className="form-section">
          <div className="form-section-head">
            <div>
              <strong>اطلاعات برنامه</strong>
              <div className="section-kicker">شبکه، گروه، طرح و تاریخ پخش</div>
            </div>
            <div className="stat-icon"><CalendarDays size={20} /></div>
          </div>
          <div className="form-section-body">
            <div className="form-grid">
              {isProvider ? <>
                <label className="field md:col-span-2">
                  <span className="label">برنامه *</span>
                  <SearchableSelect className="select" value={planId ?? ""}
                    onChange={event => changePlan(event.target.value)}
                    disabled={saving || myPlansLoading || Boolean(myPlansError)} required>
                    <option value="">{myPlansLoading ? "در حال دریافت برنامه‌ها…" : "انتخاب برنامه"}</option>
                    {(myPlans ?? []).map(plan => {
                      const networkName = networks?.Data.find(network => Number(network.Value) === plan.networkId)?.Text;
                      return <option key={plan.planId} value={plan.planId}
                        disabled={!plan.networkId || !plan.networkGroupId}>
                        {plan.title} | {networkName || (plan.networkId ? `شبکه ${plan.networkId}` : "شبکه نامشخص")}
                      </option>;
                    })}
                  </SearchableSelect>
                  {myPlansError && <small role="alert" className="text-destructive">دریافت برنامه‌های شما ناموفق بود.</small>}
                  {myPlans?.some(plan => !plan.networkId || !plan.networkGroupId) && <small className="text-destructive">اطلاعات شبکه یا گروه برخی برنامه‌ها دریافت نشده است.</small>}
                  {(myPlansError || myPlans?.some(plan => !plan.networkId || !plan.networkGroupId)) && <button
                    type="button" className="btn btn-outline" onClick={() => void reloadMyPlans()}>دریافت مجدد اطلاعات برنامه‌ها</button>}
                  {!myPlansLoading && !myPlansError && myPlans?.length === 0 && <small className="muted">برنامه‌ای به شما تخصیص داده نشده است.</small>}
                </label>
                <ProgramAssignmentFields networkId={networkId} networkGroupId={networkGroupId}
                  episodeNumber={episode?.episodeNumber} />
              </> : <>
              <NetworkSelect session={session} value={networkScope.networkId} loading={networkScope.loading}
                label="شبکه *" onChange={changeNetwork} />

              <label className="field">
                <span className="label">گروه برنامه‌ساز *</span>
                <SearchableSelect
                  className="select"
                  value={networkGroupId ?? ""}
                  onChange={(e) => changeGroup(e.target.value)}
                  disabled={!networkId}
                  required
                >
                  <option value="">انتخاب گروه</option>
                  {(groups?.Data ?? []).map((item) => {
                    const id = toPositiveInt(item.Value);
                    return id ? <option key={id} value={id}>{item.Text}</option> : null;
                  })}
                </SearchableSelect>
              </label>

              <label className="field">
                <span className="label">طرح *</span>
                <SearchableSelect
                  className="select"
                  value={planId ?? ""}
                  onChange={(e) => changePlan(e.target.value)}
                  disabled={!networkId || !networkGroupId || plansLoading || Boolean(plansError)}
                  required
                >
                  <option value="">{plansLoading ? "در حال دریافت طرح‌ها..." : "انتخاب طرح"}</option>
                  {planOptions.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </SearchableSelect>
                {plansError ? <small className="text-destructive">دریافت طرح‌ها ناموفق بود. اتصال وب‌سرویس را بررسی کنید.</small> : null}
                {networkGroupId && !plansLoading && !plansError && planOptions.length === 0 ? <small className="muted">طرح قابل انتخابی برای این گروه یافت نشد.</small> : null}
              </label>
              </>}
              {episodeLoading && <p role="status">در حال دریافت شماره قسمت…</p>}
              {episodeError && <p role="alert" className="text-destructive">
                دریافت شماره قسمت ناموفق بود.
                <button type="button" className="btn btn-outline" onClick={() => void reloadEpisode()}>تلاش مجدد</button>
              </p>}

              {!isProvider && <label className="field">
                <span className="label">شماره قسمت بعدی</span>
                <input className="input" readOnly value={episode?.episodeNumber ?? ""} />
                <small className="muted">شماره نهایی هنگام ثبت توسط بک‌اند تعیین می‌شود.</small>
              </label>}

              <div className="field">
                <span className="label">تاریخ پخش *</span>
                <PersianDatePicker value={broadcastDate} onChange={setBroadcastDate} />
                <small className="muted">فقط تاریخ انتخاب می‌شود؛ ساعت در پیش‌بینی ثبت نمی‌شود.</small>
              </div>

              <label className="field">
                <span className="label">موضوع اصلی *</span>
                <input className="input" name="mainTopic" required />
              </label>
            </div>
          </div>
        </section>

        <section className="form-section">
          <div className="form-section-head">
            <div>
              <strong>محورهای موضوعی</strong>
              <div className="section-kicker">رابط یک‌به‌چند پیش‌بینی و محورهای موضوعی</div>
            </div>
            <div className="stat-icon"><Layers3 size={20} /></div>
          </div>
          <div className="form-section-body">
            <TopicAxesEditor value={topicAxes} onChange={setTopicAxes} />
          </div>
        </section>

        <section className="form-section">
          <div className="form-section-head">
            <div>
              <strong>کارشناس برنامه</strong>
              <div className="section-kicker">در صورت نیاز کارشناسان فعال همان شبکه را انتخاب کنید.</div>
            </div>
            <div className="stat-icon"><UserRoundSearch size={20} /></div>
          </div>
          <div className="form-section-body">
            <Switch
              checked={hasExpert}
              onCheckedChange={(checked) => {
                setHasExpert(checked);
                if (!checked) setSelectedExpertIds([]);
              }}
              label="برنامه دارای کارشناس است"
              description="با فعال‌کردن این گزینه، فهرست کارشناسان برای انتخاب نمایش داده می‌شود."
            />

            {hasExpert ? (
              <div style={{ marginTop: 16 }}>
                {networkId ? (
                  <ExpertSelector
                    experts={experts ?? []}
                    selectedIds={selectedExpertIds}
                    onChange={setSelectedExpertIds}
                  />
                ) : (
                  <div className="alert" style={{ background: "#f8fafc", border: "1px solid var(--border)" }}>
                    ابتدا شبکه برنامه را انتخاب کنید تا کارشناسان همان شبکه نمایش داده شوند.
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </section>

        {message ? <div className="alert alert-error">{message}</div> : null}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button className="btn btn-primary" disabled={saving || !session || !planId || episodeLoading || !episode || Boolean(episodeError)}>
            {saving ? <Loader2 size={17} /> : <Save size={17} />}
            {saving ? "در حال ثبت..." : "ثبت پیش‌بینی"}
          </button>
        </div>
      </form>
    </DashboardShell>
  );
}

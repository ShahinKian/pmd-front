"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { CheckCircle2, Loader2, Save, Send, Trash2, Undo2, XCircle } from "lucide-react";
import DashboardShell, { Breadcrumb } from "@/components/layout/dashboard-shell";
import { apiClient, apiErrorMessage } from "@/lib/http/client";
import { FORECAST_STATUS, forecastStatusLabel, type ForecastResponse } from "@/lib/forecasts/types";
import { PersianDatePicker } from "@/components/ui/persian-date-picker";
import { Switch } from "@/components/ui/switch";
import { TopicAxesEditor } from "@/components/forecasts/topic-axes-editor";
import { ExpertSelector, type ExpertOption } from "@/components/forecasts/expert-selector";

function isoToDateOnly(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function ForecastDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, error, isLoading, mutate } = useSWR<ForecastResponse>("/forecasts/" + id);

  const { data: permittedActions, mutate: refreshActions } = useSWR<Array<{ key: string; label: string; transitionId: string }>>(data ? `/forecasts/${id}/actions` : null);
  const { data: planList } = useSWR<{ Data?: Array<{ Value: string; Text: string }> }>(
    data && !data.planName ? `/base-info/plans/${data.networkId}?networkGroupId=${data.networkGroupId}` : null
  );
  const planTitle = data?.planName || planList?.Data?.find((item) => Number(item.Value) === data?.planId)?.Text;
  const [broadcastDate, setBroadcastDate] = useState("");
  const [mainTopic, setMainTopic] = useState("");
  const [hasExpert, setHasExpert] = useState(false);
  const [topicAxes, setTopicAxes] = useState<string[]>([]);
  const [expertIds, setExpertIds] = useState<string[]>([]);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const { data: experts } = useSWR<ExpertOption[]>(
    data?.networkId
      ? `/experts?pageNumber=1&pageSize=100&isActive=true&networkId=${data.networkId}`
      : null,
  );

  useEffect(() => {
    if (!data) return;
    setBroadcastDate(isoToDateOnly(data.broadcastDate));
    setMainTopic(data.mainTopic);
    setHasExpert(data.hasExpert);
    setTopicAxes(data.topicAxes.map((item) => item.title));
    setExpertIds(data.expertIds);
  }, [data]);

  const editable =
    data?.status === FORECAST_STATUS.Draft ||
    data?.status === FORECAST_STATUS.ReturnedForEdit;
  const canReview = Boolean(permittedActions?.some((item) =>
    ["approve", "reject", "return-for-edit"].includes(item.key)
  ));

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!data || !editable) return;

    if (!broadcastDate || !mainTopic.trim()) {
      setMessage({ type: "error", text: "موضوع و تاریخ پخش الزامی هستند." });
      return;
    }

    setBusy("save");
    setMessage(null);
    try {
      await apiClient.put("/forecasts/" + id, {
        id,
        broadcastDate: `${broadcastDate}T00:00:00`,
        mainTopic: mainTopic.trim(),
        hasExpert,
        topicAxes,
        expertIds: hasExpert ? expertIds : [],
      });
      await mutate();
      setMessage({ type: "success", text: "پیش‌بینی با موفقیت ویرایش شد." });
    } catch (err) {
      setMessage({
        type: "error",
        text: apiErrorMessage(err, "ویرایش پیش‌بینی انجام نشد."),
      });
    } finally {
      setBusy("");
    }
  }

  async function action(
    name: "submit" | "approve" | "reject" | "return-for-edit",
  ) {
    let payload: Record<string, string> | undefined;

    if (name === "reject" || name === "return-for-edit") {
      const reason = window.prompt(
        name === "reject"
          ? "دلیل رد را وارد کنید:"
          : "دلیل بازگشت برای اصلاح را وارد کنید:",
      );
      if (reason === null) return;
      if (!reason.trim()) {
        setMessage({
          type: "error",
          text: "ثبت دلیل برای این عملیات الزامی است.",
        });
        return;
      }
      payload = { reason: reason.trim() };
    }

    setBusy(name);
    setMessage(null);
    try {
      await apiClient.post("/forecasts/" + id + "/actions/" + name, payload ?? { reason: null });
      await mutate();
      await refreshActions();
      setMessage({
        type: "success",
        text: "عملیات گردش‌کار با موفقیت انجام شد.",
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: apiErrorMessage(err, "عملیات گردش‌کار انجام نشد."),
      });
    } finally {
      setBusy("");
    }
  }

  async function executeCustomAction(actionKey: string, label: string) {
    if (!/^[a-z0-9-]{1,100}$/.test(actionKey)) return;
    const reason = window.prompt(`توضیحات اقدام «${label}» (اختیاری):`) ?? null;
    if (reason === null) return;
    setBusy(actionKey);
    setMessage(null);
    try {
      await apiClient.post(`/forecasts/${id}/actions/${actionKey}`, { reason });
      await mutate();
      await refreshActions();
      setMessage({ type: "success", text: "اقدام با موفقیت انجام شد." });
    } catch (error) {
      setMessage({ type: "error", text: apiErrorMessage(error, "اجرای اقدام انجام نشد.") });
    } finally {
      setBusy("");
    }
  }

  async function removeForecast() {
    if (!window.confirm("از حذف این پیش‌بینی مطمئن هستید؟")) return;
    setBusy("delete");
    try {
      await apiClient.delete("/forecasts/" + id);
      router.replace("/forecasts");
    } catch (err) {
      setMessage({
        type: "error",
        text: apiErrorMessage(err, "حذف پیش‌بینی انجام نشد."),
      });
      setBusy("");
    }
  }

  return (
    <DashboardShell>
      <Breadcrumb
        items={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "پیش‌بینی برنامه", href: "/forecasts" },
          { label: "جزئیات" },
        ]}
      />

      {isLoading ? <div className="card">در حال دریافت پیش‌بینی...</div> : null}
      {error ? <div className="alert alert-error">دریافت پیش‌بینی انجام نشد.</div> : null}

      {data ? (
        <>
          <div className="page-head">
            <div>
              <h1 className="page-title">{data.mainTopic}</h1>
              <p className="page-description">
                طرح {planTitle || `#${data.planId}`} — قسمت {data.episodeNumber}
              </p>
            </div>
            <span className="admin-badge">
              {forecastStatusLabel(data.status)}
            </span>
          </div>

          {data.workflow ? <section className="card" style={{ marginBottom: 18 }}><strong>وضعیت گردش‌کار</strong><p>فرآیند: {data.workflow.workflowName || "—"}</p><p>مرحله جاری: {data.workflow.currentNodeName || (data.status === FORECAST_STATUS.Approved ? "پایان فرآیند" : "—")}</p><p>مسئول مرحله: {data.workflow.currentNodeRole || "—"}</p></section> : null}
          <form className="grid" style={{ gap: 18 }} onSubmit={save}>
            <section className="form-section">
              <div className="form-section-head">
                <div>
                  <strong>اطلاعات پیش‌بینی</strong>
                  <div className="section-kicker">
                    در پیش‌بینی فقط تاریخ پخش ثبت می‌شود.
                  </div>
                </div>
              </div>
              <div className="form-section-body">
                <div className="form-grid">
                  <div className="field">
                    <span className="label">تاریخ پخش</span>
                    <PersianDatePicker
                      value={broadcastDate}
                      onChange={setBroadcastDate}
                      disabled={!editable}
                    />
                  </div>
                  <label className="field">
                    <span className="label">موضوع اصلی</span>
                    <input
                      className="input"
                      value={mainTopic}
                      onChange={(e) => setMainTopic(e.target.value)}
                      disabled={!editable}
                    />
                  </label>
                </div>
              </div>
            </section>

            <section className="form-section">
              <div className="form-section-head">
                <div>
                  <strong>محورهای موضوعی</strong>
                  <div className="section-kicker">
                    محورهای مرتبط با این پیش‌بینی
                  </div>
                </div>
              </div>
              <div className="form-section-body">
                <TopicAxesEditor
                  value={topicAxes}
                  onChange={setTopicAxes}
                  disabled={!editable}
                />
              </div>
            </section>

            <section className="form-section">
              <div className="form-section-head">
                <div>
                  <strong>کارشناسان برنامه</strong>
                  <div className="section-kicker">
                    انتخاب کارشناسان فعال شبکه
                  </div>
                </div>
              </div>
              <div className="form-section-body">
                <Switch
                  checked={hasExpert}
                  disabled={!editable}
                  onCheckedChange={(checked) => {
                    setHasExpert(checked);
                    if (!checked) setExpertIds([]);
                  }}
                  label="برنامه دارای کارشناس است"
                />

                {hasExpert ? (
                  <div style={{ marginTop: 16 }}>
                    <ExpertSelector
                      experts={experts ?? []}
                      selectedIds={expertIds}
                      onChange={setExpertIds}
                      disabled={!editable}
                    />
                  </div>
                ) : null}
              </div>
            </section>

            {editable ? (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button className="btn btn-primary" disabled={Boolean(busy)}>
                  {busy === "save" ? <Loader2 size={17} /> : <Save size={17} />}
                  ذخیره تغییرات
                </button>
              </div>
            ) : null}
          </form>

          <section className="card" style={{ marginTop: 18 }}>
            <strong>عملیات گردش‌کار</strong>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
              {editable && permittedActions?.some((item) => item.key === "submit") ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => action("submit")}
                  disabled={Boolean(busy)}
                >
                  {busy === "submit" ? <Loader2 size={16} /> : <Send size={16} />}
                  ارسال برای بررسی
                </button>
              ) : null}

              {canReview ? (
                <>
                  {permittedActions?.some((item) => item.key === "approve") ? <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => action("approve")}
                    disabled={Boolean(busy)}
                  >
                    {busy === "approve" ? (
                      <Loader2 size={16} />
                    ) : (
                      <CheckCircle2 size={16} />
                    )}
                    تایید
                  </button> : null}
                  {permittedActions?.some((item) => item.key === "return-for-edit") ? <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => action("return-for-edit")}
                    disabled={Boolean(busy)}
                  >
                    {busy === "return-for-edit" ? (
                      <Loader2 size={16} />
                    ) : (
                      <Undo2 size={16} />
                    )}
                    بازگشت برای اصلاح
                  </button> : null}
                  {permittedActions?.some((item) => item.key === "reject") ? <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => action("reject")}
                    disabled={Boolean(busy)}
                  >
                    {busy === "reject" ? (
                      <Loader2 size={16} />
                    ) : (
                      <XCircle size={16} />
                    )}
                    رد
                  </button> : null}
                </>
              ) : null}

              {(permittedActions ?? []).filter((item) =>
                !["submit", "approve", "reject", "return-for-edit"].includes(item.key)
              ).map((item) => (
                <button
                  key={item.transitionId}
                  type="button"
                  className="btn btn-outline"
                  onClick={() => executeCustomAction(item.key, item.label)}
                  disabled={Boolean(busy)}
                >
                  {item.label}
                </button>
              ))}

              <button
                type="button"
                className="btn btn-outline"
                onClick={removeForecast}
                disabled={Boolean(busy)}
              >
                {busy === "delete" ? <Loader2 size={16} /> : <Trash2 size={16} />}
                حذف
              </button>
            </div>
          </section>

          {message ? (
            <div
              className={
                "alert " +
                (message.type === "error" ? "alert-error" : "alert-success")
              }
              style={{ marginTop: 18 }}
            >
              {message.text}
            </div>
          ) : null}
        </>
      ) : null}
    </DashboardShell>
  );
}

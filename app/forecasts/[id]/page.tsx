"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { CheckCircle2, Loader2, Save, Send, Trash2, Undo2, XCircle } from "lucide-react";
import DashboardShell, { Breadcrumb } from "@/components/layout/dashboard-shell";
import { apiClient, apiErrorMessage } from "@/lib/http/client";
import { useSession } from "@/hooks/use-session";
import {
  FORECAST_STATUS,
  forecastStatusLabel,
  type ForecastResponse,
} from "@/lib/forecasts/types";

interface ExpertItem {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string;
}

function toLocalDateTime(value: string): string {
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    date.getFullYear() +
    "-" +
    pad(date.getMonth() + 1) +
    "-" +
    pad(date.getDate()) +
    "T" +
    pad(date.getHours()) +
    ":" +
    pad(date.getMinutes())
  );
}

export default function ForecastDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const { data: session } = useSession();
  const { data, error, isLoading, mutate } = useSWR<ForecastResponse>("/forecasts/" + id);
  const { data: experts } = useSWR<ExpertItem[]>("/experts?pageNumber=1&pageSize=100&isActive=true");

  const [broadcastDate, setBroadcastDate] = useState("");
  const [mainTopic, setMainTopic] = useState("");
  const [hasExpert, setHasExpert] = useState(false);
  const [topicAxes, setTopicAxes] = useState("");
  const [expertIds, setExpertIds] = useState<string[]>([]);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    if (!data) return;
    setBroadcastDate(toLocalDateTime(data.broadcastDate));
    setMainTopic(data.mainTopic);
    setHasExpert(data.hasExpert);
    setTopicAxes(data.topicAxes.map((item) => item.title).join("\n"));
    setExpertIds(data.expertIds);
  }, [data]);

  const editable = data?.status === FORECAST_STATUS.Draft || data?.status === FORECAST_STATUS.ReturnedForEdit;
  const pendingReview = data?.status === FORECAST_STATUS.PendingReview;
  const canReview = Boolean(
    pendingReview &&
    (session?.isSystemAdmin || session?.user.roles.includes("NetworkGroupManager")),
  );

  const selectedExpertNames = useMemo(
    () =>
      expertIds
        .map((expertId) => {
          const expert = experts?.find((item) => item.id === expertId);
          return expert ? expert.firstName + " " + expert.lastName : expertId;
        })
        .join("، "),
    [expertIds, experts],
  );

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!data || !editable) return;

    setBusy("save");
    setMessage(null);
    try {
      await apiClient.put("/forecasts/" + id, {
        id,
        broadcastDate: new Date(broadcastDate).toISOString(),
        mainTopic: mainTopic.trim(),
        hasExpert,
        topicAxes: topicAxes
          .split(/\r?\n/)
          .map((item) => item.trim())
          .filter(Boolean),
        expertIds: hasExpert ? expertIds : [],
      });
      await mutate();
      setMessage({ type: "success", text: "پیش‌بینی با موفقیت ویرایش شد." });
    } catch (err) {
      setMessage({ type: "error", text: apiErrorMessage(err, "ویرایش پیش‌بینی انجام نشد.") });
    } finally {
      setBusy("");
    }
  }

  async function action(name: "submit" | "approve" | "reject" | "return-for-edit") {
    let payload: Record<string, string> | undefined;

    if (name === "reject" || name === "return-for-edit") {
      const reason = window.prompt(
        name === "reject" ? "دلیل رد را وارد کنید:" : "دلیل بازگشت برای اصلاح را وارد کنید:",
      );
      if (reason === null) return;
      if (!reason.trim()) {
        setMessage({ type: "error", text: "ثبت دلیل برای این عملیات الزامی است." });
        return;
      }
      payload = { reason: reason.trim() };
    }

    setBusy(name);
    setMessage(null);
    try {
      await apiClient.post("/forecasts/" + id + "/" + name, payload);
      await mutate();
      setMessage({ type: "success", text: "عملیات گردش‌کار با موفقیت انجام شد." });
    } catch (err) {
      setMessage({ type: "error", text: apiErrorMessage(err, "عملیات گردش‌کار انجام نشد.") });
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
      router.refresh();
    } catch (err) {
      setMessage({ type: "error", text: apiErrorMessage(err, "حذف پیش‌بینی انجام نشد.") });
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
                طرح #{data.planId} — قسمت {data.episodeNumber} — {forecastStatusLabel(data.status)}
              </p>
            </div>
            <span className="admin-badge">{forecastStatusLabel(data.status)}</span>
          </div>

          <section className="card" style={{ marginBottom: 18 }}>
            <div className="grid grid-3">
              <div><div className="stat-label">ثبت‌کننده</div><div style={{fontWeight:750,marginTop:5}}>{data.userCreatorName || "—"}</div></div>
              <div><div className="stat-label">شبکه / گروه</div><div style={{fontWeight:750,marginTop:5}}>{data.networkId} / {data.networkGroupId}</div></div>
              <div><div className="stat-label">تاریخ ایجاد</div><div style={{fontWeight:750,marginTop:5}}>{new Date(data.createdDate).toLocaleString("fa-IR")}</div></div>
            </div>
          </section>

          <form className="card" onSubmit={save}>
            <div className="form-grid">
              <label className="field">
                <span className="label">تاریخ و ساعت پخش</span>
                <input className="input" type="datetime-local" value={broadcastDate} onChange={(e)=>setBroadcastDate(e.target.value)} disabled={!editable} />
              </label>
              <label className="field">
                <span className="label">موضوع اصلی</span>
                <input className="input" value={mainTopic} onChange={(e)=>setMainTopic(e.target.value)} disabled={!editable} />
              </label>
              <label className="field full">
                <span className="label">محورهای موضوعی</span>
                <textarea className="input" style={{height:110,paddingTop:10}} value={topicAxes} onChange={(e)=>setTopicAxes(e.target.value)} disabled={!editable}/>
              </label>
              <label className="check-card">
                <input
                  type="checkbox"
                  checked={hasExpert}
                  disabled={!editable}
                  onChange={(e)=>{setHasExpert(e.target.checked);if(!e.target.checked)setExpertIds([]);}}
                />
                <span>دارای کارشناس</span>
              </label>
              {hasExpert ? (
                <div className="field full">
                  <span className="label">کارشناسان</span>
                  {editable ? (
                    <div className="checkbox-row">
                      {(experts ?? []).map((expert)=>(
                        <label className="check-card" key={expert.id}>
                          <input
                            type="checkbox"
                            checked={expertIds.includes(expert.id)}
                            onChange={()=>setExpertIds((current)=>current.includes(expert.id)?current.filter((value)=>value!==expert.id):[...current,expert.id])}
                          />
                          <span>{expert.firstName} {expert.lastName}</span>
                          <small className="muted">{expert.specialty}</small>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="muted">{selectedExpertNames || "—"}</div>
                  )}
                </div>
              ) : null}
            </div>

            {editable ? (
              <div style={{display:"flex",justifyContent:"flex-end",marginTop:18}}>
                <button className="btn btn-primary" disabled={Boolean(busy)}>
                  {busy==="save"?<Loader2 size={17}/>:<Save size={17}/>}ذخیره تغییرات
                </button>
              </div>
            ) : null}
          </form>

          <section className="card" style={{marginTop:18}}>
            <strong>عملیات گردش‌کار</strong>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:14}}>
              {editable ? (
                <button type="button" className="btn btn-primary" onClick={()=>action("submit")} disabled={Boolean(busy)}>
                  {busy==="submit"?<Loader2 size={16}/>:<Send size={16}/>}ارسال برای بررسی
                </button>
              ) : null}

              {canReview ? (
                <>
                  <button type="button" className="btn btn-primary" onClick={()=>action("approve")} disabled={Boolean(busy)}>
                    {busy==="approve"?<Loader2 size={16}/>:<CheckCircle2 size={16}/>}تایید
                  </button>
                  <button type="button" className="btn btn-outline" onClick={()=>action("return-for-edit")} disabled={Boolean(busy)}>
                    {busy==="return-for-edit"?<Loader2 size={16}/>:<Undo2 size={16}/>}بازگشت برای اصلاح
                  </button>
                  <button type="button" className="btn btn-outline" onClick={()=>action("reject")} disabled={Boolean(busy)}>
                    {busy==="reject"?<Loader2 size={16}/>:<XCircle size={16}/>}رد
                  </button>
                </>
              ) : null}

              <button type="button" className="btn btn-outline" onClick={removeForecast} disabled={Boolean(busy)}>
                {busy==="delete"?<Loader2 size={16}/>:<Trash2 size={16}/>}حذف
              </button>
            </div>

            {!editable && !canReview ? (
              <p className="muted" style={{marginBottom:0}}>
                در وضعیت فعلی عملیاتی متناسب با نقش شما در رابط کاربری فعال نیست.
              </p>
            ) : null}
          </section>

          {message ? (
            <div className={"alert " + (message.type === "error" ? "alert-error" : "alert-success")} style={{marginTop:18}}>
              {message.text}
            </div>
          ) : null}
        </>
      ) : null}
    </DashboardShell>
  );
}

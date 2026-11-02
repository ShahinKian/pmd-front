"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Filter, RefreshCcw } from "lucide-react";
import DashboardShell, { Breadcrumb } from "@/components/layout/dashboard-shell";
import { PersianDatePicker } from "@/components/ui/persian-date-picker";
import { ProgramReportFilters } from "@/components/reports/program-report-filters";
import { profileStatusLabel, PROFILE_STATUS } from "@/lib/program-profiles/types";

interface Row {
  id: string;
  planId: number;
  networkId: number;
  networkGroupId: number;
  broadcastDate: string;
  mainTopic: string;
  status: number;
  createdByUserId: string;
  producerName: string;
  createdDate: string;
}

function ProgramName({row}:{row:Row}) {
  const {data}=useSWR<{Data?:Array<{Value:string;Text:string}>}>(
    `/base-info/plans/${row.networkId}?networkGroupId=${row.networkGroupId}`,
  );
  return <>{data?.Data?.find(x=>Number(x.Value)===row.planId)?.Text ?? "در حال دریافت..."}</>;
}

function GroupName({row}:{row:Row}) {
  const {data}=useSWR<{Data?:Array<{Value:string;Text:string}>}>(
    `/base-info/network-groups/${row.networkId}`,
  );
  return <>{data?.Data?.find(x=>Number(x.Value)===row.networkGroupId)?.Text ?? "—"}</>;
}

export default function ProfileReportPage() {
  const [fromDate,setFromDate]=useState("");
  const [toDate,setToDate]=useState("");
  const [topic,setTopic]=useState("");
  const [producer,setProducer]=useState("");
  const [networkId,setNetworkId]=useState("");
  const [groupId,setGroupId]=useState("");
  const [planId,setPlanId]=useState("");

  const url=useMemo(()=>{
    const p=new URLSearchParams();
    if(fromDate)p.set("fromDate",fromDate+"T00:00:00");
    if(toDate)p.set("toDate",toDate+"T23:59:59");
    if(topic.trim())p.set("topic",topic.trim());
    if(producer.trim())p.set("producer",producer.trim());
    if(groupId)p.set("networkGroupId",groupId);
    if(planId)p.set("planId",planId);
    return "/reports/program-profiles?"+p.toString();
  },[fromDate,toDate,topic,producer,groupId,planId]);

  const {data,error,isLoading,mutate}=useSWR<Row[]>(url);

  function reset(){
    setFromDate("");setToDate("");setTopic("");setProducer("");setNetworkId("");setGroupId("");setPlanId("");
  }

  return <DashboardShell>
    <Breadcrumb items={[{label:"داشبورد",href:"/dashboard"},{label:"گزارشات"},{label:"گزارش شناسنامه‌ها"}]}/>
    <div className="page-head">
      <div><h1 className="page-title">گزارش شناسنامه‌ها</h1><p className="page-description">جستجو در شناسنامه‌های قابل مشاهده بر اساس سطح دسترسی شما</p></div>
    </div>

    <section className="form-section mb-5">
      <div className="form-section-body">
        <div className="form-grid">
          <div className="field"><span className="label">از تاریخ</span><PersianDatePicker value={fromDate} onChange={setFromDate}/></div>
          <div className="field"><span className="label">تا تاریخ</span><PersianDatePicker value={toDate} onChange={setToDate}/></div>
          <label className="field"><span className="label">موضوع</span><input className="input" value={topic} onChange={e=>setTopic(e.target.value)} placeholder="موضوع شناسنامه"/></label>
          <label className="field"><span className="label">تهیه‌کننده</span><input className="input" value={producer} onChange={e=>setProducer(e.target.value)} placeholder="نام یا نام کاربری تهیه‌کننده"/></label>
          <ProgramReportFilters
            networkId={networkId} groupId={groupId} planId={planId}
            onNetworkChange={setNetworkId} onGroupChange={setGroupId} onPlanChange={setPlanId}
          />
        </div>
        <div className="mt-4 flex gap-2">
          <button className="btn btn-outline" onClick={reset}><Filter size={16}/>پاک‌کردن فیلترها</button>
          <button className="btn btn-outline" onClick={()=>mutate()}><RefreshCcw size={16}/>بازخوانی</button>
        </div>
      </div>
    </section>

    <section className="card" style={{padding:0,overflow:"hidden"}}>
      <div className="overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="bg-default-50"><tr>
            <th className="p-3">موضوع</th><th className="p-3">برنامه</th><th className="p-3">گروه</th>
            <th className="p-3">تهیه‌کننده</th><th className="p-3">تاریخ پخش</th><th className="p-3">وضعیت</th>
          </tr></thead>
          <tbody className="divide-y divide-default-100">
            {(data??[]).map(row=><tr key={row.id} className={row.status===PROFILE_STATUS.Approved?"bg-green-50/70":""}>
              <td className="p-3 font-semibold">{row.mainTopic}</td>
              <td className="p-3"><ProgramName row={row}/></td>
              <td className="p-3"><GroupName row={row}/></td>
              <td className="p-3">{row.producerName||"—"}</td>
              <td className="p-3">{new Date(row.broadcastDate).toLocaleDateString("fa-IR-u-ca-persian")}</td>
              <td className="p-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${row.status===PROFILE_STATUS.Approved?"bg-green-100 text-green-700":"bg-default-100 text-default-700"}`}>{profileStatusLabel(row.status)}</span></td>
            </tr>)}
          </tbody>
        </table>
      </div>
      {isLoading?<div className="p-6 muted">در حال دریافت گزارش...</div>:null}
      {error?<div className="alert alert-error m-4">دریافت گزارش انجام نشد.</div>:null}
      {!isLoading&&!error&&(data?.length??0)===0?<div className="p-8 text-center muted">موردی با این فیلترها یافت نشد.</div>:null}
    </section>
  </DashboardShell>;
}

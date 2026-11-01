"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { Filter, Plus, RefreshCcw } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import DashboardShell,{Breadcrumb} from "@/components/layout/dashboard-shell";
import { apiClient } from "@/lib/http/client";
import { PROFILE_STATUS, profileStatusLabel, type ProgramProfileResponse } from "@/lib/program-profiles/types";
import type { PaginationMeta } from "@/lib/forecasts/types";
import { PersianDatePicker } from "@/components/ui/persian-date-picker";
import type { BaseInfoListResponse } from "@/lib/base-info/browser-types";

interface ProfileListPayload {
  items: ProgramProfileResponse[];
  pagination: PaginationMeta | null;
}

async function profileListFetcher(url:string):Promise<ProfileListPayload>{
  const response=await apiClient.get<ProgramProfileResponse[]>(url);
  const raw=response.headers.pagination as string|undefined;
  let pagination:PaginationMeta|null=null;
  if(raw){try{pagination=JSON.parse(raw) as PaginationMeta;}catch{pagination=null;}}
  return {items:response.data,pagination};
}

function ProgramName({profile}:{profile:ProgramProfileResponse}){
  const {data}=useSWR<{Data?:{Value:string;Text:string}[]}>(
    `/base-info/plans/${profile.networkId}?networkGroupId=${profile.networkGroupId}`
  );
  const title=data?.Data?.find(x=>Number(x.Value)===profile.planId)?.Text;
  return <span className="block max-w-[240px] truncate" title={title||"در حال دریافت نام برنامه"}>{title||"در حال دریافت نام برنامه..."}</span>;
}

export default function ProfilesPage(){
  const {data:session}=useSession();
  const isStarter=session?.user.roles.includes("Providers")??false;

  const [status,setStatus]=useState("");
  const [topic,setTopic]=useState("");
  const [fromDate,setFromDate]=useState("");
  const [toDate,setToDate]=useState("");
  const [networkId,setNetworkId]=useState("");
  const [networkGroupId,setNetworkGroupId]=useState("");
  const [planId,setPlanId]=useState("");
  const [page,setPage]=useState(1);

  const {data:networks}=useSWR<BaseInfoListResponse>("/base-info/networks");
  const {data:groups}=useSWR<BaseInfoListResponse>(
    networkId?`/base-info/network-groups/${networkId}`:null
  );
  const {data:plans}=useSWR<BaseInfoListResponse>(
    networkId&&networkGroupId?`/base-info/plans/${networkId}?networkGroupId=${networkGroupId}`:null
  );

  const query=useMemo(()=>{
    const p=new URLSearchParams();
    if(status)p.set("status",status);
    if(topic.trim())p.set("topic",topic.trim());
    if(fromDate)p.set("fromDate",fromDate+"T00:00:00");
    if(toDate)p.set("toDate",toDate+"T23:59:59");
    if(planId)p.set("planId",planId);
    p.set("pageNumber",String(page));
    p.set("pageSize","20");
    return "/program-profiles?"+p.toString();
  },[status,topic,fromDate,toDate,planId,page]);

  const {data,error,isLoading,mutate}=useSWR<ProfileListPayload>(query,profileListFetcher);

  function resetFilters(){
    setStatus("");
    setTopic("");
    setFromDate("");
    setToDate("");
    setNetworkId("");
    setNetworkGroupId("");
    setPlanId("");
    setPage(1);
  }

  return <DashboardShell>
    <Breadcrumb items={[{label:"داشبورد",href:"/dashboard"},{label:"شناسنامه برنامه"}]}/>
    <div className="page-head">
      <div><h1 className="page-title">شناسنامه برنامه</h1><p className="page-description">صدور و پیگیری شناسنامه‌های برنامه</p></div>
      {isStarter?<Link href="/program-profiles/issue" className="btn btn-primary"><Plus size={17}/>شناسنامه جدید</Link>:null}
    </div>

    <section className="form-section" style={{marginBottom:18}}>
      <div className="form-section-head">
        <div>
          <strong>فیلتر شناسنامه‌ها</strong>
          <div className="section-kicker">جستجو بر اساس وضعیت، موضوع، بازه تاریخ و برنامه</div>
        </div>
      </div>
      <div className="form-section-body">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="field">
            <span className="label">وضعیت</span>
            <select className="select" value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}>
              <option value="">همه وضعیت‌ها</option>
              {Object.values(PROFILE_STATUS).map(value=><option key={value} value={value}>{profileStatusLabel(value)}</option>)}
            </select>
          </label>

          <label className="field">
            <span className="label">موضوع</span>
            <input className="input" value={topic} onChange={e=>{setTopic(e.target.value);setPage(1);}} placeholder="جستجو در موضوع"/>
          </label>

          <div className="field">
            <span className="label">از تاریخ</span>
            <PersianDatePicker value={fromDate} onChange={value=>{setFromDate(value);setPage(1);}}/>
          </div>

          <div className="field">
            <span className="label">تا تاریخ</span>
            <PersianDatePicker value={toDate} onChange={value=>{setToDate(value);setPage(1);}}/>
          </div>

          <label className="field">
            <span className="label">شبکه</span>
            <select className="select" value={networkId} onChange={e=>{setNetworkId(e.target.value);setNetworkGroupId("");setPlanId("");setPage(1);}}>
              <option value="">همه شبکه‌ها</option>
              {(networks?.Data??[]).map(x=><option key={x.Value} value={x.Value} disabled={x.Disabled}>{x.Text}</option>)}
            </select>
          </label>

          <label className="field">
            <span className="label">گروه</span>
            <select className="select" value={networkGroupId} disabled={!networkId} onChange={e=>{setNetworkGroupId(e.target.value);setPlanId("");setPage(1);}}>
              <option value="">همه گروه‌ها</option>
              {(groups?.Data??[]).map(x=><option key={x.Value} value={x.Value} disabled={x.Disabled}>{x.Text}</option>)}
            </select>
          </label>

          <label className="field md:col-span-3">
            <span className="label">برنامه</span>
            <select className="select" value={planId} disabled={!networkId||!networkGroupId} onChange={e=>{setPlanId(e.target.value);setPage(1);}}>
              <option value="">همه برنامه‌ها</option>
              {(plans?.Data??[]).map(x=><option key={x.Value} value={x.Value} disabled={x.Disabled}>{x.Text}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn btn-outline" onClick={resetFilters}><Filter size={16}/>پاک‌کردن فیلترها</button>
          <button type="button" className="btn btn-outline" onClick={()=>mutate()}><RefreshCcw size={16}/>بازخوانی</button>
        </div>
      </div>
    </section>

    <section className="card" style={{padding:0,overflow:"hidden"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead style={{background:"#f8fafc"}}><tr>
          <th style={{padding:12,textAlign:"right"}}>موضوع</th>
          <th style={{padding:12,textAlign:"right"}}>نام برنامه</th>
          <th style={{padding:12,textAlign:"right"}}>تاریخ پخش</th>
          <th style={{padding:12,textAlign:"right"}}>وضعیت</th>
          <th style={{padding:12,textAlign:"right"}}>عملیات</th>
        </tr></thead>
        <tbody>{(data?.items??[]).map(p=>{
          const approved=p.status===PROFILE_STATUS.Approved;
          return <tr key={p.id} className={approved?"bg-green-50/80":""} style={{borderTop:"1px solid var(--border)"}}>
            <td style={{padding:12,fontWeight:700}}>{p.mainTopic}</td>
            <td style={{padding:12}}><ProgramName profile={p}/></td>
            <td style={{padding:12}}>{new Date(p.broadcastDate).toLocaleDateString("fa-IR-u-ca-persian")}</td>
            <td style={{padding:12}}>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${approved?"bg-green-100 text-green-700":"bg-default-100 text-default-700"}`}>
                {profileStatusLabel(p.status,p.statusDisplayName)}
              </span>
            </td>
            <td style={{padding:12}}><Link href={`/program-profiles/${p.id}`} className="btn btn-outline">مشاهده</Link></td>
          </tr>;
        })}</tbody>
      </table>
      {isLoading?<div style={{padding:24}} className="muted">در حال دریافت...</div>:null}
      {error?<div className="alert alert-error" style={{margin:16}}>دریافت شناسنامه‌ها انجام نشد.</div>:null}
      {!isLoading&&!error&&(data?.items.length??0)===0?<div style={{padding:30,textAlign:"center"}} className="muted">موردی برای نمایش وجود ندارد.</div>:null}
    </section>

    {data?.pagination?<div className="mt-4 flex items-center justify-between">
      <span className="muted text-xs">صفحه {data.pagination.PageNumber} از {data.pagination.TotalPages} — {data.pagination.TotalCount} رکورد</span>
      <div className="flex gap-2">
        <button className="btn btn-outline" disabled={!data.pagination.HasPrevious} onClick={()=>setPage(x=>Math.max(1,x-1))}>قبلی</button>
        <button className="btn btn-outline" disabled={!data.pagination.HasNext} onClick={()=>setPage(x=>x+1)}>بعدی</button>
      </div>
    </div>:null}
  </DashboardShell>;
}

"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { Plus } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import DashboardShell,{Breadcrumb} from "@/components/layout/dashboard-shell";
import { apiClient } from "@/lib/http/client";
import { PROFILE_STATUS, profileStatusLabel, type ProgramProfileResponse } from "@/lib/program-profiles/types";
import type { PaginationMeta } from "@/lib/forecasts/types";

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
  const [page,setPage]=useState(1);
  const {data,error,isLoading}=useSWR<ProfileListPayload>(
    `/program-profiles?pageNumber=${page}&pageSize=20`,
    profileListFetcher,
  );

  return <DashboardShell>
    <Breadcrumb items={[{label:"داشبورد",href:"/dashboard"},{label:"شناسنامه برنامه"}]}/>
    <div className="page-head">
      <div><h1 className="page-title">شناسنامه برنامه</h1><p className="page-description">صدور و پیگیری شناسنامه‌های برنامه</p></div>
      {isStarter?<Link href="/program-profiles/issue" className="btn btn-primary"><Plus size={17}/>شناسنامه جدید</Link>:null}
    </div>

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

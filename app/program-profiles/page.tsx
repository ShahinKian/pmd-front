"use client";

import Link from "next/link";
import useSWR from "swr";
import { Plus } from "lucide-react";
import DashboardShell,{Breadcrumb} from "@/components/layout/dashboard-shell";
import {profileStatusLabel,type ProgramProfileResponse} from "@/lib/program-profiles/types";

function ProgramName({profile}:{profile:ProgramProfileResponse}){
  const {data}=useSWR<{Data?:{Value:string;Text:string}[]}>(
    "/base-info/plans/"+profile.networkId+"?networkGroupId="+profile.networkGroupId
  );
  const title=data?.Data?.find(x=>Number(x.Value)===profile.planId)?.Text;
  return <span className="block max-w-[240px] truncate" title={title||"در حال دریافت نام برنامه"}>{title||"در حال دریافت نام برنامه..."}</span>;
}
export default function ProfilesPage(){
  const {data,error,isLoading}=useSWR<ProgramProfileResponse[]>("/program-profiles?pageNumber=1&pageSize=50");
  return <DashboardShell>
    <Breadcrumb items={[{label:"داشبورد",href:"/dashboard"},{label:"شناسنامه برنامه"}]}/>
    <div className="page-head">
      <div><h1 className="page-title">شناسنامه برنامه</h1><p className="page-description">صدور و پیگیری شناسنامه‌های برنامه</p></div>
      <Link href="/program-profiles/issue" className="btn btn-primary"><Plus size={17}/>صدور شناسنامه</Link>
    </div>
    <section className="card" style={{padding:0,overflow:"hidden"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead style={{background:"#f8fafc"}}><tr>
          <th style={{padding:12,textAlign:"right"}}>موضوع</th><th style={{padding:12,textAlign:"right"}}>نام برنامه</th>
          <th style={{padding:12,textAlign:"right"}}>تاریخ پخش</th><th style={{padding:12,textAlign:"right"}}>وضعیت</th>
          <th style={{padding:12,textAlign:"right"}}>عملیات</th>
        </tr></thead>
        <tbody>{(data??[]).map(p=><tr key={p.id} style={{borderTop:"1px solid var(--border)"}}>
          <td style={{padding:12,fontWeight:700}}>{p.mainTopic}</td>
          <td style={{padding:12}}><ProgramName profile={p}/></td>
          <td style={{padding:12}}>{new Date(p.broadcastDate).toLocaleDateString("fa-IR-u-ca-persian")}</td>
          <td style={{padding:12}}><span className="admin-badge">{profileStatusLabel(p.status,p.statusDisplayName)}</span></td>
          <td style={{padding:12}}><Link href={"/program-profiles/"+p.id} className="btn btn-outline">مشاهده</Link></td>
        </tr>)}</tbody>
      </table>
      {isLoading?<div style={{padding:24}} className="muted">در حال دریافت...</div>:null}
      {error?<div className="alert alert-error" style={{margin:16}}>دریافت شناسنامه‌ها انجام نشد.</div>:null}
      {!isLoading&&!error&&(data?.length??0)===0?<div style={{padding:30,textAlign:"center"}} className="muted">موردی برای نمایش وجود ندارد.</div>:null}
    </section>
  </DashboardShell>;
}

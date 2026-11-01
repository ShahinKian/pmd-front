"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Plus, Save } from "lucide-react";
import DashboardShell,{Breadcrumb} from "@/components/layout/dashboard-shell";
import { useSession } from "@/hooks/use-session";
import { apiClient,apiErrorMessage } from "@/lib/http/client";
import { showToast } from "@/lib/ui/toast";
import type { BaseInfoListResponse } from "@/lib/base-info/browser-types";

interface KeywordRow{
  id:string;
  title:string;
  isGlobal:boolean;
  networkId:number|null;
  isActive:boolean;
}

export default function KeywordsPage(){
  const {data:session}=useSession();
  const {data:keywords,mutate,isLoading,error}=useSWR<KeywordRow[]>("/keywords");
  const {data:networks}=useSWR<BaseInfoListResponse>("/base-info/networks");
  const [title,setTitle]=useState("");
  const [isGlobal,setIsGlobal]=useState(false);
  const [networkId,setNetworkId]=useState("");
  const [saving,setSaving]=useState(false);

  const allowedNetworks=useMemo(()=>{
    const all=(networks?.Data??[]).map(x=>({id:Number(x.Value),text:x.Text,disabled:x.Disabled})).filter(x=>x.id>0);
    if(session?.isSystemAdmin)return all;
    const ids=new Set(session?.user.networkIds??[]);
    return all.filter(x=>ids.has(x.id));
  },[networks,session]);

  async function addKeyword(){
    if(!title.trim()){showToast({type:"error",message:"عنوان کلیدواژه را وارد کنید."});return;}
    if(!isGlobal&&!networkId){showToast({type:"error",message:"برای کلیدواژه شبکه‌ای، شبکه را انتخاب کنید."});return;}
    setSaving(true);
    try{
      await apiClient.post("/keywords",{title:title.trim(),isGlobal,networkId:isGlobal?null:Number(networkId)});
      setTitle("");setIsGlobal(false);setNetworkId("");
      await mutate();
      showToast({type:"success",message:"کلیدواژه با موفقیت ثبت شد."});
    }catch(e){
      showToast({type:"error",message:apiErrorMessage(e,"ثبت کلیدواژه انجام نشد.")});
    }finally{setSaving(false);}
  }

  async function toggle(row:KeywordRow){
    try{
      await apiClient.put(`/keywords/${row.id}`,{title:row.title,isActive:!row.isActive});
      await mutate();
      showToast({type:"success",message:"وضعیت کلیدواژه به‌روزرسانی شد."});
    }catch(e){
      showToast({type:"error",message:apiErrorMessage(e,"ویرایش کلیدواژه انجام نشد.")});
    }
  }

  const networkName=(id:number|null)=>id?allowedNetworks.find(x=>x.id===id)?.text??`شبکه ${id}`:"سراسری";

  return <DashboardShell>
    <Breadcrumb items={[{label:"داشبورد",href:"/dashboard"},{label:"اطلاعات پایه"},{label:"کلیدواژه‌ها"}]}/>
    <div className="page-head"><div><h1 className="page-title">کلیدواژه‌ها</h1><p className="page-description">کلیدواژه‌های سراسری و شبکه‌ای برای شناسنامه و گزارش‌گیری</p></div></div>

    <section className="card mb-5">
      <h2 className="mb-4 font-semibold">تعریف کلیدواژه جدید</h2>
      <div className="form-grid">
        <label className="field"><span className="label">عنوان</span><input className="input" value={title} onChange={e=>setTitle(e.target.value)} maxLength={120}/></label>
        {session?.isSystemAdmin?<label className="field"><span className="label">نوع</span><select className="select" value={isGlobal?"global":"network"} onChange={e=>{const global=e.target.value==="global";setIsGlobal(global);if(global)setNetworkId("");}}><option value="network">شبکه‌ای</option><option value="global">سراسری</option></select></label>:null}
        {!isGlobal?<label className="field"><span className="label">شبکه</span><select className="select" value={networkId} onChange={e=>setNetworkId(e.target.value)}><option value="">انتخاب شبکه</option>{allowedNetworks.map(x=><option key={x.id} value={x.id} disabled={x.disabled}>{x.text}</option>)}</select></label>:null}
      </div>
      <button className="btn btn-primary mt-4" disabled={saving} onClick={addKeyword}><Plus size={16}/>ثبت کلیدواژه</button>
    </section>

    <section className="card" style={{padding:0,overflow:"hidden"}}>
      <table className="w-full text-right text-sm">
        <thead className="bg-default-50"><tr><th className="p-3">کلیدواژه</th><th className="p-3">سطح</th><th className="p-3">وضعیت</th><th className="p-3">عملیات</th></tr></thead>
        <tbody className="divide-y divide-default-100">{(keywords??[]).map(row=><tr key={row.id}>
          <td className="p-3 font-semibold">{row.title}</td>
          <td className="p-3">{row.isGlobal?"سراسری":networkName(row.networkId)}</td>
          <td className="p-3"><span className={`rounded-full px-2 py-1 text-xs ${row.isActive?"bg-green-100 text-green-700":"bg-red-100 text-red-700"}`}>{row.isActive?"فعال":"غیرفعال"}</span></td>
          <td className="p-3"><button className="btn btn-outline" onClick={()=>toggle(row)}><Save size={15}/>{row.isActive?"غیرفعال‌سازی":"فعال‌سازی"}</button></td>
        </tr>)}</tbody>
      </table>
      {isLoading?<div className="p-6 muted">در حال دریافت...</div>:null}
      {error?<div className="alert alert-error m-4">دریافت کلیدواژه‌ها انجام نشد.</div>:null}
    </section>
  </DashboardShell>;
}

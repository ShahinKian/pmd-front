"use client";

import {FormEvent,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import useSWR from "swr";
import {Loader2,Save} from "lucide-react";
import DashboardShell,{Breadcrumb} from "@/components/layout/dashboard-shell";
import {apiClient,apiErrorMessage} from "@/lib/http/client";
import type {ForecastResponse} from "@/lib/forecasts/types";
import type {BaseInfoListResponse} from "@/lib/base-info/browser-types";

type Crew={personnelId:number;personnelName:string;activityTypeId:number;activityTypeName:string;isPresent:boolean};
type Item={itemName:string;productionType:string;duration:string};

export default function IssueProfilePage(){
  const router=useRouter();
  const {data:forecasts}=useSWR<ForecastResponse[]>("/forecasts?status=3&pageNumber=1&pageSize=100");
  const [forecastId,setForecastId]=useState("");
  const selected=useMemo(()=>forecasts?.find(x=>x.id===forecastId)??null,[forecasts,forecastId]);
  const {data:structures}=useSWR<BaseInfoListResponse>("/base-info/structure-programs");
  const [crewText,setCrewText]=useState("");
  const [itemsText,setItemsText]=useState("");
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");

  function parseCrew():Crew[]{
    return crewText.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(line=>{
      const [personnelId,personnelName,activityTypeId,activityTypeName,isPresent]=line.split("|").map(x=>x.trim());
      return {personnelId:Number(personnelId),personnelName,activityTypeId:Number(activityTypeId),activityTypeName,isPresent:isPresent!=="0"&&isPresent!=="false"};
    }).filter(x=>Number.isInteger(x.personnelId)&&x.personnelId>0&&Number.isInteger(x.activityTypeId)&&x.activityTypeId>0&&x.personnelName&&x.activityTypeName);
  }
  function parseItems():Item[]{
    return itemsText.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(line=>{
      const [itemName,productionType,duration]=line.split("|").map(x=>x.trim());
      return {itemName,productionType,duration};
    }).filter(x=>x.itemName&&x.productionType&&x.duration);
  }

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setMessage("");
    if(!selected){setMessage("پیش‌بینی تاییدشده را انتخاب کنید.");return;}
    const form=new FormData(e.currentTarget);
    const crewMembers=parseCrew();
    if(!crewMembers.length){setMessage("حداقل یک عامل معتبر وارد کنید.");return;}
    setSaving(true);
    try{
      const response=await apiClient.post("/program-profiles/issue",{
        forecastId:selected.id,
        planId:selected.planId,
        networkId:selected.networkId,
        networkGroupId:selected.networkGroupId,
        duration:String(form.get("duration")??""),
        broadcastDate:selected.broadcastDate,
        productionMethod:String(form.get("productionMethod")??""),
        occasion:String(form.get("occasion")??""),
        floorId:Number(form.get("floorId")),
        floorName:String(form.get("floorName")??""),
        programDegreeId:Number(form.get("programDegreeId")),
        programDegreeName:String(form.get("programDegreeName")??""),
        programStructureId:Number(form.get("programStructureId")),
        programStructureName:String(form.get("programStructureName")??""),
        startTime:String(form.get("startTime")??""),
        programType:Number(form.get("programType")),
        programTypeName:String(form.get("programTypeName")??""),
        crewMembers,
        items:parseItems(),
      });
      router.replace("/program-profiles/"+response.data.id);
    }catch(error){setMessage(apiErrorMessage(error,"صدور شناسنامه انجام نشد."));}
    finally{setSaving(false);}
  }

  return <DashboardShell>
    <Breadcrumb items={[{label:"داشبورد",href:"/dashboard"},{label:"شناسنامه عملکرد",href:"/program-profiles"},{label:"صدور شناسنامه"}]}/>
    <div className="page-head"><div><h1 className="page-title">صدور شناسنامه عملکرد</h1><p className="page-description">فقط از پیش‌بینی تاییدشده صادر می‌شود.</p></div></div>
    <form className="card" onSubmit={submit}>
      <div className="form-grid">
        <label className="field full"><span className="label">پیش‌بینی تاییدشده *</span><select className="select" value={forecastId} onChange={e=>setForecastId(e.target.value)} required><option value="">انتخاب کنید</option>{(forecasts??[]).map(x=><option key={x.id} value={x.id}>{x.mainTopic} — طرح {x.planId} — قسمت {x.episodeNumber}</option>)}</select></label>
        <label className="field"><span className="label">مدت برنامه *</span><input className="input" name="duration" placeholder="01:00:00" required/></label>
        <label className="field"><span className="label">نحوه تولید *</span><input className="input" name="productionMethod" required/></label>
        <label className="field"><span className="label">مناسبت *</span><input className="input" name="occasion" required/></label>
        <label className="field"><span className="label">شناسه طبقه *</span><input className="input" name="floorId" type="number" min="1" required/></label>
        <label className="field"><span className="label">نام طبقه *</span><input className="input" name="floorName" required/></label>
        <label className="field"><span className="label">شناسه درجه *</span><input className="input" name="programDegreeId" type="number" min="1" required/></label>
        <label className="field"><span className="label">نام درجه *</span><input className="input" name="programDegreeName" required/></label>
        <label className="field"><span className="label">ساختار برنامه *</span><select className="select" name="programStructureId" required><option value="">انتخاب کنید</option>{(structures?.Data??[]).map(x=><option key={x.Value} value={x.Value}>{x.Text}</option>)}</select></label>
        <label className="field"><span className="label">نام ساختار *</span><input className="input" name="programStructureName" required/></label>
        <label className="field"><span className="label">ساعت شروع *</span><input className="input" name="startTime" placeholder="20:00:00" required/></label>
        <label className="field"><span className="label">نوع برنامه *</span><select className="select" name="programType" required><option value="10">زنده</option><option value="20">ضبطی</option></select></label>
        <label className="field"><span className="label">نام نوع برنامه *</span><input className="input" name="programTypeName" defaultValue="زنده" required/></label>
        <label className="field full"><span className="label">عوامل *</span><textarea className="input" style={{height:140,paddingTop:10}} value={crewText} onChange={e=>setCrewText(e.target.value)} placeholder="personnelId | نام | activityTypeId | عنوان فعالیت | true — هر عامل در یک خط"/></label>
        <label className="field full"><span className="label">آیتم‌ها</span><textarea className="input" style={{height:120,paddingTop:10}} value={itemsText} onChange={e=>setItemsText(e.target.value)} placeholder="نام آیتم | نوع تولید | 00:10:00 — هر آیتم در یک خط"/></label>
      </div>
      <div className="alert" style={{marginTop:16,background:"#eff6ff",border:"1px solid #bfdbfe",color:"#1e40af"}}>ساختار دقیق پاسخ planDetail / estimateDetail / planItems در مستند سرویس خارجی مشخص نشده؛ بنابراین در این مرحله داده ناشناخته به‌صورت حدسی تبدیل نمی‌شود و فیلدها قابل کنترل هستند.</div>
      {message?<div className="alert alert-error" style={{marginTop:16}}>{message}</div>:null}
      <div style={{display:"flex",justifyContent:"flex-end",marginTop:18}}><button className="btn btn-primary" disabled={saving}>{saving?<Loader2 size={17}/>:<Save size={17}/>}صدور شناسنامه</button></div>
    </form>
  </DashboardShell>;
}

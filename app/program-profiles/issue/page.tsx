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
  const [structureId,setStructureId]=useState("");
  const {data:degrees,isLoading:degreesLoading,error:degreesError}=useSWR<BaseInfoListResponse>(structureId?`/base-info/program-degrees/${structureId}`:null);
  const {data:planDetail,error:planDetailError}=useSWR<unknown>(selected?`/base-info/plan-detail/${selected.planId}`:null);
  const {data:estimateDetail,error:estimateError}=useSWR<unknown>(selected?`/base-info/estimate-detail/${selected.planId}`:null);
  const {data:planItems,error:itemsError}=useSWR<unknown>(selected?`/base-info/plan-items/${selected.planId}`:null);
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
    const structureName=(structures?.Data??[]).find(x=>x.Value===String(form.get("programStructureId")))?.Text??"";
    const degreeName=(degrees?.Data??[]).find(x=>x.Value===String(form.get("programDegreeId")))?.Text??"";
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
        programDegreeName:degreeName,
        programStructureId:Number(form.get("programStructureId")),
        programStructureName:structureName,
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
        <label className="field full"><span className="label">پیش‌بینی تاییدشده *</span><select className="select" value={forecastId} onChange={e=>setForecastId(e.target.value)} required><option value="">انتخاب کنید</option>{(forecasts??[]).map(x=><option key={x.id} value={x.id}>{x.mainTopic} — طرح {x.planName || x.planId} — قسمت {x.episodeNumber}</option>)}</select></label>
        <label className="field"><span className="label">مدت برنامه *</span><input className="input" name="duration" placeholder="01:00:00" required/></label>
        <label className="field"><span className="label">نحوه تولید *</span><input className="input" name="productionMethod" required/></label>
        <label className="field"><span className="label">مناسبت *</span><input className="input" name="occasion" required/></label>
        <label className="field"><span className="label">شناسه طبقه *</span><input className="input" name="floorId" type="number" min="1" required/></label>
        <label className="field"><span className="label">نام طبقه *</span><input className="input" name="floorName" required/></label>
        <label className="field"><span className="label">ساختار برنامه *</span><select className="select" name="programStructureId" value={structureId} onChange={e=>setStructureId(e.target.value)} required><option value="">انتخاب کنید</option>{(structures?.Data??[]).map(x=><option key={x.Value} value={x.Value}>{x.Text}</option>)}</select></label>
        <label className="field"><span className="label">درجه برنامه *</span><select className="select" name="programDegreeId" key={structureId} disabled={!structureId||degreesLoading} required><option value="">{degreesLoading?"در حال دریافت...":"انتخاب درجه"}</option>{(degrees?.Data??[]).map(x=><option key={x.Value} value={x.Value}>{x.Text}</option>)}</select>{degreesError?<small className="text-destructive">دریافت درجه برنامه از وب‌سرویس ناموفق بود.</small>:null}</label>
        <label className="field"><span className="label">ساعت شروع *</span><input className="input" name="startTime" placeholder="20:00:00" required/></label>
        <label className="field"><span className="label">نوع برنامه *</span><select className="select" name="programType" required><option value="10">زنده</option><option value="20">ضبطی</option></select></label>
        <label className="field"><span className="label">نام نوع برنامه *</span><input className="input" name="programTypeName" defaultValue="زنده" required/></label>
        <label className="field full"><span className="label">عوامل *</span><textarea className="input" style={{height:140,paddingTop:10}} value={crewText} onChange={e=>setCrewText(e.target.value)} placeholder="personnelId | نام | activityTypeId | عنوان فعالیت | true — هر عامل در یک خط"/></label>
        <label className="field full"><span className="label">آیتم‌ها</span><textarea className="input" style={{height:120,paddingTop:10}} value={itemsText} onChange={e=>setItemsText(e.target.value)} placeholder="نام آیتم | نوع تولید | 00:10:00 — هر آیتم در یک خط"/></label>
      </div>
      {selected?<section className="card" style={{marginTop:16}}>
        <strong>وضعیت دریافت اطلاعات از وب‌سرویس خارجی</strong>
        <p>جزئیات طرح: {planDetailError?"خطا در دریافت":planDetail?"دریافت شد":"در حال دریافت..."}</p>
        <p>جزئیات پیش‌بینی: {estimateError?"خطا در دریافت":estimateDetail?"دریافت شد":"در حال دریافت..."}</p>
        <p>آیتم‌های طرح: {itemsError?"خطا در دریافت":planItems?"دریافت شد":"در حال دریافت..."}</p>
        <p className="muted">برای اتصال خودکار عوامل و آیتم‌ها باید قالب واقعی پاسخ‌های این سرویس‌ها مشخص شود.</p>
      </section>:null}
      {message?<div className="alert alert-error" style={{marginTop:16}}>{message}</div>:null}
      <div style={{display:"flex",justifyContent:"flex-end",marginTop:18}}><button className="btn btn-primary" disabled={saving}>{saving?<Loader2 size={17}/>:<Save size={17}/>}صدور شناسنامه</button></div>
    </form>
  </DashboardShell>;
}

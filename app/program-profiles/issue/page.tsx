"use client";

import {FormEvent,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import useSWR from "swr";
import {Loader2,Save} from "lucide-react";
import DashboardShell,{Breadcrumb} from "@/components/layout/dashboard-shell";
import {apiClient,apiErrorMessage} from "@/lib/http/client";
import type {ForecastResponse} from "@/lib/forecasts/types";

type Crew={personnelId:number;personnelName:string;activityTypeId:number;activityTypeName:string;isPresent:boolean};
type Item={itemName:string;productionType:string;duration:string};
type ExternalItem={Id:number;PlanId:number;ItemTitle:string;ItemSubject:string;ItemPeriod:string};
type ExternalCrew={Id:number;PersonnelId:number|null;PersonnelName:string|null;ActivityTypeId:number;ActivityTypeName:string;BussinessTypeName:string;ProgramActivityTypeName:string|null};
type ExternalResponse<T>={IsSuccess:boolean;Data:T[]|null;Message:string|null};
function normalizeDuration(value:string):string {
  const time=value.trim().split(".")[0];
  return /^\d{2,}:\d{2}:\d{2}$/.test(time)?time:"";
}
function totalDuration(items:ExternalItem[]):string {
  const seconds=items.reduce((total,item)=>{
    const parts=normalizeDuration(item.ItemPeriod).split(":").map(Number);
    return parts.length===3?total+parts[0]*3600+parts[1]*60+parts[2]:total;
  },0);
  return [Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60].map(n=>String(n).padStart(2,"0")).join(":");
}
type PlanDetail={PlanId:number;ApplicationType:number;ApplicationTypeName:string;ProgramType:number;ProgramTypeName:string;ProgramDegreeId:number;ProgramDegreeName:string;FloorPlanId:number;FloorPlanName:string;StructureProgramId:number;StructureProgramName:string};
type PlanDetailResponse={IsSuccess:boolean;Data:PlanDetail|null;Message:string|null};

export default function IssueProfilePage(){
  const router=useRouter();
  const {data:forecasts}=useSWR<ForecastResponse[]>("/forecasts?status=3&pageNumber=1&pageSize=100");
  const [forecastId,setForecastId]=useState("");
  const selected=useMemo(()=>forecasts?.find(x=>x.id===forecastId)??null,[forecasts,forecastId]);
  const {data:structures}=useSWR<BaseInfoListResponse>("/base-info/structure-programs");
  const {data:planDetail,error:planDetailError}=useSWR<PlanDetailResponse>(selected?`/base-info/plan-detail/${selected.planId}`:null);
  const planData=planDetail?.IsSuccess&&planDetail.Data?.PlanId===selected?.planId?planDetail.Data:null;
  const {data:estimateDetail,error:estimateError}=useSWR<ExternalResponse<ExternalCrew>>(selected?`/base-info/estimate-detail/${selected.planId}`:null);
  const {data:planItems,error:itemsError}=useSWR<ExternalResponse<ExternalItem>>(selected?`/base-info/plan-items/${selected.planId}`:null);
  const externalCrew=estimateDetail?.IsSuccess&&Array.isArray(estimateDetail.Data)?estimateDetail.Data:null;
  const externalItems=planItems?.IsSuccess&&Array.isArray(planItems.Data)
    ?planItems.Data.filter(item=>item.PlanId===selected?.planId):null;
  const missingPersonnel=externalCrew?.filter(person=>!person.PersonnelId||!person.PersonnelName)||[];
  const validCrew=externalCrew?.filter(person=>person.PersonnelId&&person.PersonnelName&&person.ActivityTypeId>0)||[];
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setMessage("");
    if(!selected){setMessage("پیش‌بینی تاییدشده را انتخاب کنید.");return;}
    const form=new FormData(e.currentTarget);
    if(!planData){setMessage("اطلاعات پایه طرح دریافت نشده است.");return;}
    if(!externalCrew||!externalItems){setMessage("دریافت عوامل و آیتم‌های طرح کامل نشده است.");return;}
    if(missingPersonnel.length){setMessage("برخی ردیف‌های عوامل فاقد شناسه یا نام شخص هستند؛ ابتدا در سامانه مرجع تکمیل شوند.");return;}
    const crewMembers:Crew[]=validCrew.map(person=>({
      personnelId:person.PersonnelId!,personnelName:person.PersonnelName!,
      activityTypeId:person.ActivityTypeId,activityTypeName:person.ActivityTypeName,isPresent:true
    }));
    if(!crewMembers.length){setMessage("عامل معتبر در اطلاعات طرح یافت نشد.");return;}
    const items:Item[]=externalItems.map(item=>({
      itemName:item.ItemTitle,productionType:String(form.get("productionMethod")??"").trim(),
      duration:normalizeDuration(item.ItemPeriod)
    }));
    if(items.some(item=>!item.duration)){setMessage("مدت زمان یک یا چند آیتم نامعتبر است.");return;}
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
        floorId:planData.FloorPlanId,
        floorName:planData.FloorPlanName,
        programDegreeId:planData.ProgramDegreeId,
        programDegreeName:planData.ProgramDegreeName,
        programStructureId:planData.StructureProgramId,
        programStructureName:planData.StructureProgramName,
        startTime:String(form.get("startTime")??""),
        programType:planData.ProgramType,
        programTypeName:planData.ProgramTypeName,
        crewMembers,
        items,
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
        <label className="field"><span className="label">طبقه</span><input className="input" readOnly value={planData?.FloorPlanName??""}/></label>
        <label className="field"><span className="label">درجه برنامه</span><input className="input" readOnly value={planData?.ProgramDegreeName??""}/></label>
        <label className="field"><span className="label">ساختار برنامه</span><input className="input" readOnly value={planData?.StructureProgramName??""}/></label>
        <label className="field"><span className="label">نوع کاربرد</span><input className="input" readOnly value={planData?.ApplicationTypeName??""}/></label>
        <label className="field"><span className="label">ساعت شروع *</span><input className="input" name="startTime" placeholder="20:00:00" required/></label>
        <label className="field"><span className="label">نوع برنامه</span><input className="input" readOnly value={planData?.ProgramTypeName??""}/></label>

      </div>
      <section className="card" style={{marginTop:16}}>
        <strong>آیتم‌های مصوب طرح (فقط خواندنی)</strong>
        <p className="muted">مدت کل آیتم‌ها: {externalItems?totalDuration(externalItems):"—"}</p>
        {itemsError?<p className="alert alert-error">دریافت آیتم‌های طرح ناموفق بود.</p>:null}
        {externalItems?<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><th>عنوان آیتم</th><th>موضوع</th><th>مدت پخش</th></tr></thead><tbody>
          {externalItems.map(item=><tr key={item.Id}><td>{item.ItemTitle}</td><td>{item.ItemSubject.trim()}</td><td dir="ltr">{normalizeDuration(item.ItemPeriod)}</td></tr>)}
        </tbody></table></div>:<p>در حال دریافت آیتم‌ها...</p>}
      </section>
      <section className="card" style={{marginTop:16}}>
        <strong>عوامل مصوب طرح (فقط خواندنی)</strong>
        {estimateError?<p className="alert alert-error">دریافت عوامل برنامه ناموفق بود.</p>:null}
        {externalCrew?<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><th>نام</th><th>حرفه</th><th>نوع فعالیت</th><th>وضعیت</th></tr></thead><tbody>
          {externalCrew.map(person=><tr key={person.Id}><td>{person.PersonnelName||"تعیین نشده"}</td><td>{person.BussinessTypeName}</td><td>{person.ProgramActivityTypeName?.trim()||person.ActivityTypeName}</td><td>{person.PersonnelId?"معتبر":"نیازمند تعیین عامل"}</td></tr>)}
        </tbody></table></div>:<p>در حال دریافت عوامل...</p>}
        {missingPersonnel.length>0?<p className="alert alert-error">{missingPersonnel.length} ردیف فاقد اطلاعات شخص است؛ برای جلوگیری از ثبت نادرست، صدور تا تکمیل در سامانه مرجع غیرفعال است.</p>:null}
      </section>
      {selected?<section className="card" style={{marginTop:16}}>
        <strong>وضعیت دریافت اطلاعات از وب‌سرویس خارجی</strong>
        <p>جزئیات طرح: {planDetailError?"خطا در دریافت":planDetail?"دریافت شد":"در حال دریافت..."}</p>
        <p>جزئیات پیش‌بینی: {estimateError?"خطا در دریافت":estimateDetail?"دریافت شد":"در حال دریافت..."}</p>
        <p>آیتم‌های طرح: {itemsError?"خطا در دریافت":planItems?"دریافت شد":"در حال دریافت..."}</p>
        <p className="muted">عوامل و آیتم‌ها از سرویس مرجع بارگذاری شده و قابل تغییر در این فرم نیستند.</p>
      </section>:null}
      {message?<div className="alert alert-error" style={{marginTop:16}}>{message}</div>:null}
      <div style={{display:"flex",justifyContent:"flex-end",marginTop:18}}><button className="btn btn-primary" disabled={saving||!planData||!externalCrew||!externalItems||missingPersonnel.length>0}>{saving?<Loader2 size={17}/>:<Save size={17}/>}صدور شناسنامه</button></div>
    </form>
  </DashboardShell>;
}

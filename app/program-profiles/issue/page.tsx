"use client";

import {FormEvent,useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import useSWR from "swr";
import {Loader2,Save,Trash2,Clock3,Users,Layers3} from "lucide-react";
import DashboardShell,{Breadcrumb} from "@/components/layout/dashboard-shell";
import {apiClient,apiErrorMessage} from "@/lib/http/client";
import type {ForecastResponse} from "@/lib/forecasts/types";

type Crew={personnelId:number;personnelName:string;activityTypeId:number;activityTypeName:string;isPresent:boolean};
type Item={itemName:string;productionType:string;duration:string};
type ExternalItem={Id:number;PlanId:number;ItemTitle:string;ItemSubject:string;ItemPeriod:string};
type ExternalCrew={Id:number;PersonnelId:number|null;PersonnelName:string|null;ActivityTypeId:number;ActivityTypeName:string;BussinessTypeId:number;BussinessTypeName:string;ProgramActivityTypeName:string|null};
type EditableItem=Item&{rowId:string;subject:string};
type EditableCrew=Crew&{rowId:string;jobId:number;jobName:string};
type PersonnelResponse={IsSuccess:boolean;Data:{Value:string;Text:string;Disabled:boolean}[];Message:string|null};
function PersonnelPicker({networkId,jobId,value,onChange}:{networkId:number;jobId:number;value:number;onChange:(id:number,name:string)=>void}){
  const {data,error,isLoading}=useSWR<PersonnelResponse>(jobId>0&&networkId>0?`/base-info/program-makers?jobId=${jobId}&networkId=${networkId}`:null);
  const options=data?.IsSuccess?data.Data:[];
  return <div><select className="select" value={value||""} disabled={!jobId||isLoading} onChange={e=>{
    const id=Number(e.target.value);const selected=options.find(x=>Number(x.Value)===id);
    onChange(id,selected?.Text??"");
  }}>
    <option value="">{isLoading?"در حال دریافت...":"انتخاب عامل"}</option>
    {value>0&&!options.some(x=>Number(x.Value)===value)?<option value={value}>عامل فعلی (شناسه {value})</option>:null}
    {options.map(x=><option key={x.Value} value={x.Value} disabled={x.Disabled}>{x.Text}</option>)}
  </select>{error||data&&!data.IsSuccess?<small className="text-destructive">دریافت فهرست پرسنل ناموفق بود.</small>:null}</div>;
}
type ExternalResponse<T>={IsSuccess:boolean;Data:T[]|null;Message:string|null};
function normalizeDuration(value:string):string {
  const time=value.trim().split(".")[0];
  return /^\d{2,}:\d{2}:\d{2}$/.test(time)?time:"";
}
function durationSeconds(value:string):number {
  const match=/^(\d{1,}):([0-5]\d):([0-5]\d)(?:\.\d+)?$/.exec(value.trim());
  return match?Number(match[1])*3600+Number(match[2])*60+Number(match[3]):0;
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
  const {data:planDetail,error:planDetailError}=useSWR<PlanDetailResponse>(selected?`/base-info/plan-detail/${selected.planId}`:null);
  const planData=planDetail?.IsSuccess&&planDetail.Data?.PlanId===selected?.planId?planDetail.Data:null;
  const {data:estimateDetail,error:estimateError}=useSWR<ExternalResponse<ExternalCrew>>(selected?`/base-info/estimate-detail/${selected.planId}`:null);
  const {data:planItems,error:itemsError}=useSWR<ExternalResponse<ExternalItem>>(selected?`/base-info/plan-items/${selected.planId}`:null);
  const externalCrew=estimateDetail?.IsSuccess&&Array.isArray(estimateDetail.Data)?estimateDetail.Data:null;
  const externalItems=planItems?.IsSuccess&&Array.isArray(planItems.Data)
    ?planItems.Data.filter(item=>item.PlanId===selected?.planId):null;
  const [itemsDraft,setItemsDraft]=useState<EditableItem[]>([]);
  const [crewDraft,setCrewDraft]=useState<EditableCrew[]>([]);
  const [addJobId,setAddJobId]=useState("");
  const [addJobName,setAddJobName]=useState("");
  const {data:jobs}=useSWR<{IsSuccess:boolean;Data:{Value:string;Text:string}[]}>("/base-info/business-types");
  useEffect(()=>{
    setItemsDraft((externalItems??[]).map(item=>({
      rowId:String(item.Id),itemName:item.ItemTitle,subject:item.ItemSubject,
      duration:normalizeDuration(item.ItemPeriod),productionType:""
    })));
  },[planItems,selected?.planId]);
  useEffect(()=>{
    setCrewDraft((externalCrew??[]).map(person=>({
      rowId:String(person.Id),personnelId:person.PersonnelId??0,
      personnelName:person.PersonnelName??"",activityTypeId:person.ActivityTypeId,
      activityTypeName:person.ActivityTypeName,isPresent:true,
      jobId:person.BussinessTypeId,jobName:person.BussinessTypeName
    })));
  },[estimateDetail,selected?.planId]);
  function editCrew(id:string,patch:Partial<EditableCrew>){setCrewDraft(rows=>rows.map(row=>row.rowId===id?{...row,...patch}:row));}
  const crewValid=crewDraft.filter(x=>x.personnelId>0&&x.personnelName.trim()&&x.activityTypeId>0);
  const [programDuration,setProgramDuration]=useState("");
  const itemTotalSeconds=itemsDraft.reduce((sum,item)=>sum+durationSeconds(item.duration),0);
  const durationLimitSeconds=durationSeconds(programDuration);
  const overDuration=durationLimitSeconds>0&&itemTotalSeconds>durationLimitSeconds;
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setMessage("");
    if(!selected){setMessage("پیش‌بینی تاییدشده را انتخاب کنید.");return;}
    const form=new FormData(e.currentTarget);
    if(!planData){setMessage("اطلاعات پایه طرح دریافت نشده است.");return;}
    if(!externalCrew||!externalItems){setMessage("دریافت عوامل و آیتم‌های طرح کامل نشده است.");return;}
    const crewMembers:Crew[]=crewValid.map(({personnelId,personnelName,activityTypeId,activityTypeName,isPresent})=>({personnelId,personnelName,activityTypeId,activityTypeName,isPresent}));
    if(crewDraft.some(person=>!person.personnelId||!person.personnelName.trim()||!person.activityTypeId||!person.activityTypeName.trim())){setMessage("برای تمام ردیف‌های عوامل، شخص و فعالیت معتبر انتخاب کنید یا ردیف ناقص را حذف کنید.");return;}
    if(!crewMembers.length){setMessage("حداقل یک عامل معتبر برای صدور لازم است.");return;}
    const items:Item[]=itemsDraft.map(({itemName,duration,productionType})=>({itemName:itemName.trim(),duration:normalizeDuration(duration),productionType:productionType.trim()||String(form.get("productionMethod")??"").trim()}));
    if(items.some(item=>!item.itemName||!item.duration||!item.productionType)){setMessage("مدت زمان یک یا چند آیتم نامعتبر است.");return;}
    if(!durationLimitSeconds){setMessage("مدت برنامه را به شکل ساعت:دقیقه:ثانیه وارد کنید.");return;}
    if(overDuration){setMessage("مجموع زمان آیتم‌ها نباید از مدت برنامه بیشتر باشد.");return;}
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
        <label className="field"><span className="label">مدت برنامه *</span><input className="input" name="duration" dir="ltr" value={programDuration} onChange={e=>setProgramDuration(e.target.value)} placeholder="01:00:00" required/></label>
        <label className="field"><span className="label">نحوه تولید *</span><input className="input" name="productionMethod" required/></label>
        <label className="field"><span className="label">مناسبت *</span><input className="input" name="occasion" required/></label>
        <label className="field"><span className="label">طبقه</span><input className="input" readOnly value={planData?.FloorPlanName??""}/></label>
        <label className="field"><span className="label">درجه برنامه</span><input className="input" readOnly value={planData?.ProgramDegreeName??""}/></label>
        <label className="field"><span className="label">ساختار برنامه</span><input className="input" readOnly value={planData?.StructureProgramName??""}/></label>
        <label className="field"><span className="label">نوع کاربرد</span><input className="input" readOnly value={planData?.ApplicationTypeName??""}/></label>
        <label className="field"><span className="label">ساعت شروع *</span><input className="input" name="startTime" placeholder="20:00:00" required/></label>
        <label className="field"><span className="label">نوع برنامه</span><input className="input" readOnly value={planData?.ProgramTypeName??""}/></label>

      </div>
      <section className="rounded-2xl border border-default-200 bg-card p-5 shadow-sm" style={{marginTop:20}}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3"><span className="rounded-xl bg-primary/10 p-3 text-primary"><Layers3 size={22}/></span><div><h2 className="font-semibold">آیتم‌های شناسنامه</h2><p className="mt-1 text-xs text-default-500">آیتم‌های مصوب از وب‌سرویس خوانده می‌شوند؛ فقط حذف از این شناسنامه مجاز است.</p></div></div>
          <div className="rounded-xl bg-default-50 px-4 py-3 text-sm"><Clock3 size={15} className="ml-2 inline-block"/><span>زمان آیتم‌ها: </span><strong dir="ltr">{totalDuration(itemsDraft.map(x=>({Id:0,PlanId:0,ItemTitle:x.itemName,ItemSubject:x.subject,ItemPeriod:x.duration})))}</strong><span className="mx-2">/</span><span dir="ltr">{programDuration||"—"}</span></div>
        </div>
        {itemsError?<p className="alert alert-error">دریافت آیتم‌های طرح ناموفق بود.</p>:null}
        {overDuration?<p className="alert alert-error mb-4">مجموع مدت آیتم‌ها از مدت برنامه بیشتر است. برای صدور شناسنامه، آیتم‌های اضافی را حذف کنید یا مدت برنامه را اصلاح کنید.</p>:null}
        <div className="overflow-x-auto rounded-xl border border-default-200">
          <table className="w-full text-right text-sm"><thead className="bg-default-50 text-default-600"><tr><th className="p-3">عنوان آیتم</th><th className="p-3">موضوع</th><th className="p-3">مدت</th><th className="w-16 p-3" aria-label="عملیات"></th></tr></thead>
            <tbody className="divide-y divide-default-100">{itemsDraft.map(item=><tr key={item.rowId} className="transition-colors hover:bg-default-50"><td className="p-3 font-medium">{item.itemName}</td><td className="p-3 text-default-500">{item.subject}</td><td className="p-3 font-medium" dir="ltr">{item.duration}</td><td className="p-3"><button type="button" className="rounded-lg p-2 text-danger hover:bg-danger/10" title="حذف آیتم" aria-label={`حذف آیتم ${item.itemName}`} onClick={()=>setItemsDraft(rows=>rows.filter(x=>x.rowId!==item.rowId))}><Trash2 size={17}/></button></td></tr>)}</tbody>
          </table>
          {itemsDraft.length===0?<p className="p-5 text-center text-default-500">آیتمی برای این شناسنامه باقی نمانده است.</p>:null}
        </div>
      </section>
      <section className="rounded-2xl border border-default-200 bg-card p-5 shadow-sm" style={{marginTop:20}}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3"><span className="rounded-xl bg-primary/10 p-3 text-primary"><Users size={22}/></span><div><h2 className="font-semibold">عوامل شناسنامه</h2><p className="mt-1 text-xs text-default-500">نام عامل از وب‌سرویس پرسنل قابل تغییر است؛ نوع فعالیت از اطلاعات پایه خوانده می‌شود.</p></div></div>
          <div className="flex flex-wrap gap-2"><select className="select" aria-label="شغل عامل جدید" value={addJobId} onChange={e=>{setAddJobId(e.target.value);setAddJobName(jobs?.Data.find(x=>x.Value===e.target.value)?.Text??"");}}><option value="">انتخاب شغل برای افزودن</option>{(jobs?.Data??[]).map(x=><option key={x.Value} value={x.Value}>{x.Text}</option>)}</select><button className="btn btn-outline" type="button" disabled={!addJobId} onClick={()=>setCrewDraft(rows=>[...rows,{rowId:crypto.randomUUID(),personnelId:0,personnelName:"",activityTypeId:0,activityTypeName:"",jobId:Number(addJobId),jobName:addJobName,isPresent:true}])}>افزودن عامل</button></div>
        </div>
        {estimateError?<p className="alert alert-error">دریافت عوامل ناموفق بود.</p>:null}
        <div className="overflow-x-auto rounded-xl border border-default-200">
          <table className="w-full text-right text-sm"><thead className="bg-default-50 text-default-600"><tr><th className="p-3">عامل</th><th className="p-3">نوع فعالیت</th><th className="w-16 p-3" aria-label="عملیات"></th></tr></thead>
            <tbody className="divide-y divide-default-100">{crewDraft.map(person=><tr key={person.rowId} className="hover:bg-default-50"><td className="min-w-56 p-3"><PersonnelPicker networkId={selected?.networkId??0} jobId={person.jobId} value={person.personnelId} onChange={(id,name)=>editCrew(person.rowId,{personnelId:id,personnelName:name})}/></td><td className="p-3 text-default-700">{person.activityTypeName||"فعالیت مشخص نشده"}</td><td className="p-3"><button type="button" title="حذف عامل" aria-label={`حذف عامل ${person.personnelName||"بدون نام"}`} className="rounded-lg p-2 text-danger hover:bg-danger/10" onClick={()=>setCrewDraft(rows=>rows.filter(x=>x.rowId!==person.rowId))}><Trash2 size={17}/></button></td></tr>)}</tbody>
          </table>
          {crewDraft.length===0?<p className="p-5 text-center text-default-500">عاملی انتخاب نشده است.</p>:null}
        </div>
        {crewDraft.some(x=>!x.personnelId||!x.activityTypeId)?<p className="mt-3 text-sm text-danger">ردیف‌های ناقص را حذف کنید یا اطلاعات آن‌ها را از وب‌سرویس تکمیل کنید.</p>:null}
      </section>
      {selected?<section className="card" style={{marginTop:16}}>
        <strong>وضعیت دریافت اطلاعات از وب‌سرویس خارجی</strong>
        <p>جزئیات طرح: {planDetailError?"خطا در دریافت":planDetail?"دریافت شد":"در حال دریافت..."}</p>
        <p>جزئیات پیش‌بینی: {estimateError?"خطا در دریافت":estimateDetail?"دریافت شد":"در حال دریافت..."}</p>
        <p>آیتم‌های طرح: {itemsError?"خطا در دریافت":planItems?"دریافت شد":"در حال دریافت..."}</p>
        <p className="muted">اطلاعات پایه از سرویس مرجع دریافت می‌شود؛ لیست عوامل و آیتم‌ها در شناسنامه قابل تنظیم است.</p>
      </section>:null}
      {message?<div className="alert alert-error" style={{marginTop:16}}>{message}</div>:null}
      <div style={{display:"flex",justifyContent:"flex-end",marginTop:18}}><button className="btn btn-primary" disabled={saving||!planData||!externalCrew||!externalItems||crewValid.length===0||crewDraft.length!==crewValid.length||overDuration||!durationLimitSeconds}>{saving?<Loader2 size={17}/>:<Save size={17}/>}صدور شناسنامه</button></div>
    </form>
  </DashboardShell>;
}

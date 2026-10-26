"use client";

import {FormEvent,useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import useSWR from "swr";
import {Loader2,Save} from "lucide-react";
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
  function editItem(id:string,patch:Partial<EditableItem>){setItemsDraft(rows=>rows.map(row=>row.rowId===id?{...row,...patch}:row));}
  function editCrew(id:string,patch:Partial<EditableCrew>){setCrewDraft(rows=>rows.map(row=>row.rowId===id?{...row,...patch}:row));}
  const crewValid=crewDraft.filter(x=>x.personnelId>0&&x.personnelName.trim()&&x.activityTypeId>0);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setMessage("");
    if(!selected){setMessage("پیش‌بینی تاییدشده را انتخاب کنید.");return;}
    const form=new FormData(e.currentTarget);
    if(!planData){setMessage("اطلاعات پایه طرح دریافت نشده است.");return;}
    if(!externalCrew||!externalItems){setMessage("دریافت عوامل و آیتم‌های طرح کامل نشده است.");return;}
    const crewMembers:Crew[]=crewValid.map(({personnelId,personnelName,activityTypeId,activityTypeName,isPresent})=>({personnelId,personnelName,activityTypeId,activityTypeName,isPresent}));
    if(!crewMembers.length){setMessage("عامل معتبر در اطلاعات طرح یافت نشد.");return;}
    const items:Item[]=itemsDraft.map(({itemName,duration,productionType})=>({itemName:itemName.trim(),duration:normalizeDuration(duration),productionType:productionType.trim()||String(form.get("productionMethod")??"").trim()}));
    if(items.some(item=>!item.itemName||!item.duration||!item.productionType)){setMessage("مدت زمان یک یا چند آیتم نامعتبر است.");return;}
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
        <div className="flex items-center justify-between gap-3"><strong>آیتم‌های شناسنامه</strong><button type="button" className="btn btn-outline" onClick={()=>setItemsDraft(rows=>[...rows,{rowId:crypto.randomUUID(),itemName:"",subject:"",duration:"00:05:00",productionType:""}])}>افزودن آیتم</button></div>
        <p className="muted">آیتم‌های اولیه از طرح دریافت می‌شوند؛ تغییرات فقط در شناسنامه ثبت خواهند شد.</p>
        {itemsError?<p className="alert alert-error">دریافت آیتم‌های طرح ناموفق بود.</p>:null}
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><th>عنوان آیتم</th><th>موضوع</th><th>مدت (ساعت:دقیقه:ثانیه)</th><th>نوع تولید</th><th>حذف</th></tr></thead><tbody>
          {itemsDraft.map(item=><tr key={item.rowId}><td><input className="input" value={item.itemName} onChange={e=>editItem(item.rowId,{itemName:e.target.value})}/></td><td><input className="input" value={item.subject} onChange={e=>editItem(item.rowId,{subject:e.target.value})}/></td><td><input className="input" dir="ltr" value={item.duration} onChange={e=>editItem(item.rowId,{duration:e.target.value})}/></td><td><input className="input" value={item.productionType} placeholder="پیش‌فرض: نحوه تولید برنامه" onChange={e=>editItem(item.rowId,{productionType:e.target.value})}/></td><td><button type="button" className="btn btn-outline" onClick={()=>setItemsDraft(rows=>rows.filter(x=>x.rowId!==item.rowId))}>حذف</button></td></tr>)}
        </tbody></table></div>
        <p>مجموع زمان آیتم‌ها: {totalDuration(itemsDraft.map(x=>({Id:0,PlanId:0,ItemTitle:x.itemName,ItemSubject:x.subject,ItemPeriod:x.duration})))}</p>
      </section>
      <section className="card" style={{marginTop:16}}>
        <div className="flex items-center justify-between gap-3"><strong>عوامل شناسنامه</strong><div className="flex gap-2"><select className="select" value={addJobId} onChange={e=>{setAddJobId(e.target.value);setAddJobName(jobs?.Data.find(x=>x.Value===e.target.value)?.Text??"");}}><option value="">شغل جدید</option>{(jobs?.Data??[]).map(x=><option key={x.Value} value={x.Value}>{x.Text}</option>)}</select><button className="btn btn-outline" type="button" disabled={!addJobId} onClick={()=>setCrewDraft(rows=>[...rows,{rowId:crypto.randomUUID(),personnelId:0,personnelName:"",activityTypeId:0,activityTypeName:"",jobId:Number(addJobId),jobName:addJobName,isPresent:true}])}>افزودن عامل</button></div></div>
        <p className="muted">پرسنل براساس شغل و شبکه از وب‌سرویس انتخاب می‌شوند. ردیف‌های بدون شخص را تعیین یا حذف کنید.</p>
        {estimateError?<p className="alert alert-error">دریافت عوامل ناموفق بود.</p>:null}
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><th>شغل</th><th>عامل برنامه</th><th>نوع فعالیت</th><th>حضور</th><th>حذف</th></tr></thead><tbody>
          {crewDraft.map(person=><tr key={person.rowId}><td>{person.jobName}</td><td><PersonnelPicker networkId={selected?.networkId??0} jobId={person.jobId} value={person.personnelId} onChange={(id,name)=>editCrew(person.rowId,{personnelId:id,personnelName:name})}/></td><td><input className="input" value={person.activityTypeName} placeholder="نوع فعالیت" onChange={e=>editCrew(person.rowId,{activityTypeName:e.target.value})}/><input className="input" type="number" min="1" aria-label="شناسه فعالیت" value={person.activityTypeId||""} onChange={e=>editCrew(person.rowId,{activityTypeId:Number(e.target.value)})}/></td><td><input type="checkbox" checked={person.isPresent} onChange={e=>editCrew(person.rowId,{isPresent:e.target.checked})}/></td><td><button type="button" className="btn btn-outline" onClick={()=>setCrewDraft(rows=>rows.filter(x=>x.rowId!==person.rowId))}>حذف</button></td></tr>)}
        </tbody></table></div>
        {crewDraft.some(x=>!x.personnelId||!x.activityTypeId)?<p className="alert">ردیف‌های ناقص در زمان صدور ثبت نمی‌شوند؛ برای ثبت همه عوامل، شخص و نوع فعالیت را انتخاب کنید.</p>:null}
      </section>
      {selected?<section className="card" style={{marginTop:16}}>
        <strong>وضعیت دریافت اطلاعات از وب‌سرویس خارجی</strong>
        <p>جزئیات طرح: {planDetailError?"خطا در دریافت":planDetail?"دریافت شد":"در حال دریافت..."}</p>
        <p>جزئیات پیش‌بینی: {estimateError?"خطا در دریافت":estimateDetail?"دریافت شد":"در حال دریافت..."}</p>
        <p>آیتم‌های طرح: {itemsError?"خطا در دریافت":planItems?"دریافت شد":"در حال دریافت..."}</p>
        <p className="muted">اطلاعات پایه از سرویس مرجع دریافت می‌شود؛ لیست عوامل و آیتم‌ها در شناسنامه قابل تنظیم است.</p>
      </section>:null}
      {message?<div className="alert alert-error" style={{marginTop:16}}>{message}</div>:null}
      <div style={{display:"flex",justifyContent:"flex-end",marginTop:18}}><button className="btn btn-primary" disabled={saving||!planData||!externalCrew||!externalItems||crewValid.length===0}>{saving?<Loader2 size={17}/>:<Save size={17}/>}صدور شناسنامه</button></div>
    </form>
  </DashboardShell>;
}

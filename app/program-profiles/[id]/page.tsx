"use client";

import {useParams} from "next/navigation";
import {useState} from "react";
import useSWR from "swr";
import {CheckCircle2,Loader2,MessageSquare,Send,Undo2} from "lucide-react";
import DashboardShell,{Breadcrumb} from "@/components/layout/dashboard-shell";
import {apiClient,apiErrorMessage} from "@/lib/http/client";
import {useSession} from "@/hooks/use-session";
import {PROFILE_STATUS,profileStatusLabel,type ProgramProfileResponse,type SupervisorComment} from "@/lib/program-profiles/types";

function roleForStage(profile:ProgramProfileResponse):string|null{
  switch(profile.status){
    case PROFILE_STATUS.PendingGroupManager:return "NetworkGroupManager";
    case PROFILE_STATUS.PendingSupervisor:return profile.programType===10?"LiveSupervisor":"Supervisor";
    case PROFILE_STATUS.PendingBroadcastManager:return "BroadcastManager";
    case PROFILE_STATUS.PendingPlanningManager:return "PlanManager";
    default:return null;
  }
}

export default function ProfileDetailsPage(){
  const {id}=useParams<{id:string}>();
  const {data:session}=useSession();
  const {data,error,isLoading,mutate}=useSWR<ProgramProfileResponse>("/program-profiles/"+id);
  const {data:permittedActions,mutate:refreshActions}=useSWR<Array<{key:string;label:string;transitionId:string}>>(data?"/program-profiles/"+id+"/actions":null);
  const {data:plans}=useSWR<{Data?:{Value:string;Text:string}[]}>(data?"/base-info/plans/"+data.networkId+"?networkGroupId="+data.networkGroupId:null);
  const programName=plans?.Data?.find(p=>Number(p.Value)===data?.planId)?.Text;
  const {data:expertDirectory}=useSWR<{id:string;firstName:string;lastName:string}[]>(data?"/experts?networkId="+data.networkId+"&pageNumber=1&pageSize=100":null);
  const {data:comments,mutate:mutateComments}=useSWR<SupervisorComment[]>("/program-profiles/"+id+"/supervisor-comments");
  const [busy,setBusy]=useState("");
  const [comment,setComment]=useState("");
  const [returnAction,setReturnAction]=useState<{key:string;label:string}|null>(null);
  const [returnReason,setReturnReason]=useState("");
  const {data:forecast}=useSWR<{expertIds:string[];topicAxes:{id:string;title:string}[]}>(data?.forecastId?`/forecasts/${data.forecastId}`:null);
  const [message,setMessage]=useState<{type:"error"|"success";text:string}|null>(null);

  const activeStageRole=data?roleForStage(data):null;
  const canAct=Boolean(data&&activeStageRole&&(session?.isSystemAdmin||session?.user.roles.includes(activeStageRole)));
  const returnActions=(permittedActions??[]).filter(x=>/return|reject|بازگشت|ارجاع.*اصلاح/i.test(x.key+" "+x.label));
  const canReturn=Boolean(returnActions.length);
  const canComment=Boolean(data?.status===PROFILE_STATUS.PendingSupervisor&&activeStageRole&&(session?.isSystemAdmin||session?.user.roles.includes(activeStageRole)));
  const canSubmit=Boolean(data&&(data.status===PROFILE_STATUS.Draft||data.status===PROFILE_STATUS.ReturnedForEdit));

  async function action(name:"submit"|"approve"|"return"){
    let payload:unknown=undefined;
    setBusy(name);setMessage(null);
    try{
      await apiClient.post("/program-profiles/"+id+"/"+name,payload,{
        headers: activeStageRole ? {"X-Active-Role": session?.isSystemAdmin ? "Admin" : activeStageRole} : undefined
      });
      await mutate();await refreshActions();
      setMessage({type:"success",text:name==="submit"?"شناسنامه به گردش‌کار ارسال شد.":"عملیات با موفقیت انجام شد."});
    }catch(e){setMessage({type:"error",text:apiErrorMessage(e,"عملیات انجام نشد.")});}
    finally{setBusy("");}
  }

  async function executeCustomAction(actionKey:string,label:string,reason=""){
    if(!/^[a-z0-9-]{1,100}$/.test(actionKey))return;
    setBusy(actionKey);setMessage(null);
    try{
      await apiClient.post("/program-profiles/"+id+"/actions/"+actionKey,{reason});
      await mutate();await refreshActions();
      setMessage({type:"success",text:"اقدام با موفقیت انجام شد."});
      if(returnAction){setReturnAction(null);setReturnReason("");}
    }catch(error){setMessage({type:"error",text:apiErrorMessage(error,"اجرای اقدام انجام نشد.")});}
    finally{setBusy("");}
  }

  async function submitReturn(){
    if(!returnAction||!returnReason.trim()){setMessage({type:"error",text:"علت بازگشت الزامی است."});return;}
    await executeCustomAction(returnAction.key,returnAction.label,returnReason.trim());
  }

  async function saveComment(){
    if(!comment.trim())return;
    setBusy("comment");setMessage(null);
    try{
      await apiClient.post("/program-profiles/"+id+"/supervisor-comments",{comment:comment.trim()});
      setComment("");await mutateComments();
      setMessage({type:"success",text:"نظر ناظر ثبت شد. اکنون می‌توانید مرحله را تایید کنید."});
    }catch(e){setMessage({type:"error",text:apiErrorMessage(e,"ثبت نظر ناظر انجام نشد.")});}
    finally{setBusy("");}
  }

  return <DashboardShell>
    <Breadcrumb items={[{label:"داشبورد",href:"/dashboard"},{label:"شناسنامه برنامه",href:"/program-profiles"},{label:"جزئیات"}]}/>
    {isLoading?<div className="card shadow-sm">در حال دریافت شناسنامه...</div>:null}
    {error?<div className="alert alert-error">دریافت شناسنامه انجام نشد.</div>:null}
    {data?<><div className="page-head"><div><h1 className="page-title">{data.mainTopic}</h1><p className="page-description">{programName||"در حال دریافت نام برنامه..."} — {profileStatusLabel(data.status,data.statusDisplayName)}</p></div><span className="admin-badge">{profileStatusLabel(data.status,data.statusDisplayName)}</span></div>
      {data.lastReturnReason?<div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-md dark:border-amber-900 dark:bg-amber-950/20"><h2 className="mb-2 font-semibold text-amber-900 dark:text-amber-200">علت بازگشت برای اصلاح</h2><p className="whitespace-pre-wrap text-sm text-amber-900 dark:text-amber-100">{data.lastReturnReason}</p></div>:null}
      <div className="grid grid-2">
        <section className="card"><h2 className="mb-4 border-b border-default-200 pb-3 text-base font-semibold">اطلاعات برنامه</h2>
          <div className="grid gap-3 text-sm sm:grid-cols-2"><p><span className="text-default-500">نوع برنامه: </span>{data.programTypeName}</p><p><span className="text-default-500">نحوه تولید: </span>{data.productionMethod}</p><p><span className="text-default-500">مناسبت: </span>{data.occasion}</p>
          <p>تاریخ پخش: {new Date(data.broadcastDate).toLocaleDateString("fa-IR-u-ca-persian")}</p><p>مدت: {data.duration}</p><p>ساعت شروع: {data.startTime}</p>
          <p><span className="text-default-500">ساختار: </span>{data.programStructureName}</p><p><span className="text-default-500">درجه: </span>{data.programDegreeName}</p><p><span className="text-default-500">طبقه: </span>{data.floorName}</p></div>
        </section>
        <section className="card"><h2 className="mb-4 border-b border-default-200 pb-3 text-base font-semibold">گردش‌کار</h2>
          {canSubmit?<p className="muted">شناسنامه نزد تهیه‌کننده است. برای ورود به گردش‌کار، دکمه «ارسال به گردش‌کار» را بزنید.</p>:null}
          <p className="muted">مرحله فعلی: {profileStatusLabel(data.status,data.statusDisplayName)}</p>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:14}}>
            {canSubmit?<button className="btn btn-primary" onClick={()=>action("submit")} disabled={Boolean(busy)}>{busy==="submit"?<Loader2 size={16}/>:<Send size={16}/>}ارسال به گردش‌کار</button>:null}
            {canAct&&permittedActions?.some(x=>x.key==="approve")?<button className="btn btn-primary" onClick={()=>action("approve")} disabled={Boolean(busy)}>{busy==="approve"?<Loader2 size={16}/>:<CheckCircle2 size={16}/>}تایید مرحله</button>:null}
            {canReturn?returnActions.map(x=><button key={x.transitionId} className="btn border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100" onClick={()=>setReturnAction({key:x.key,label:x.label})} disabled={Boolean(busy)}><Undo2 size={16}/>{x.label}</button>):null}
            {(permittedActions??[]).filter(x=>!["submit","approve"].includes(x.key)&&!returnActions.some(r=>r.transitionId===x.transitionId)).map(x=>
              <button key={x.transitionId} className="btn btn-outline" onClick={()=>executeCustomAction(x.key,x.label)} disabled={Boolean(busy)}>{x.label}</button>
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-2" style={{marginTop:18}}>
        <section className="card"><h2 className="mb-4 text-base font-semibold">عوامل برنامه</h2>
          <div className="overflow-x-auto"><table className="w-full text-right text-sm"><thead className="bg-default-50"><tr><th className="p-3">نام عامل</th><th className="p-3">فعالیت</th></tr></thead><tbody className="divide-y divide-default-100">{(data.crewMembers??[]).map(x=><tr key={x.id??x.personnelId}><td className="p-3">{x.personnelName}</td><td className="p-3">{x.activityTypeName}</td></tr>)}</tbody></table></div>
          {!data.crewMembers?.length?<p className="muted">عاملی ثبت نشده است.</p>:null}
        </section>
        <section className="card"><h2 className="mb-4 text-base font-semibold">آیتم‌های برنامه</h2>
          <div className="overflow-x-auto"><table className="w-full text-right text-sm"><thead className="bg-default-50"><tr><th className="p-3">عنوان آیتم</th><th className="p-3">مدت</th></tr></thead><tbody className="divide-y divide-default-100">{(data.items??[]).map(x=><tr key={x.id??x.itemName}><td className="p-3">{x.itemName}</td><td dir="ltr" className="p-3">{x.duration}</td></tr>)}</tbody></table></div>
          {!data.items?.length?<p className="muted">آیتمی ثبت نشده است.</p>:null}
        </section>
      </div>

      {(data.experts??[]).length>0?<section className="card" style={{marginTop:18}}>
        <h2 className="mb-4 text-base font-semibold">کارشناسان برنامه</h2>
        <div className="overflow-x-auto"><table className="w-full text-right text-sm"><thead className="bg-default-50"><tr><th className="p-3">کارشناس</th><th className="p-3">محور موضوعی</th><th className="p-3">مدت صحبت</th><th className="p-3">نوع حضور</th><th className="p-3">پرداخت</th></tr></thead><tbody className="divide-y divide-default-100">{data.experts.map(x=><tr key={x.id??x.expertId}><td className="p-3">{expertDirectory?.find(e=>e.id===x.expertId)?[expertDirectory.find(e=>e.id===x.expertId)?.firstName,expertDirectory.find(e=>e.id===x.expertId)?.lastName].filter(Boolean).join(" "):"شناسه کارشناس: "+x.expertId}</td><td className="p-3">{forecast?.topicAxes?.find(a=>a.id===x.topicAxisId)?.title||"محور ثبت‌شده"}</td><td className="p-3" dir="ltr">{x.duration}</td><td className="p-3">{({InPerson:"حضوری",Phone:"تلفنی",Recorded:"ضبطی",Workplace:"محل کار"} as Record<string,string>)[String(x.attendanceType)]||String(x.attendanceType)}</td><td className="p-3">{x.hasPayment?"بله":"خیر"}</td></tr>)}</tbody></table></div>
      </section>:null}
      {((comments?.length??0)>0||canComment)?<section className="card" style={{marginTop:18}}>
        <h2 style={{fontSize:16}}>نظرات ناظر</h2>
        {(comments??[]).map(c=><div key={c.id} style={{padding:"10px 0",borderBottom:"1px solid var(--border)"}}><strong>{c.supervisorName}</strong><div className="muted" style={{fontSize:11}}>{new Date(c.createdDate).toLocaleString("fa-IR")}</div><p style={{marginBottom:0}}>{c.comment}</p></div>)}
        {canComment?<div style={{marginTop:16}}><textarea className="input" style={{height:100,paddingTop:10,width:"100%"}} value={comment} onChange={e=>setComment(e.target.value)} placeholder="نظر ناظر را وارد کنید"/><button className="btn btn-primary" style={{marginTop:10}} onClick={saveComment} disabled={busy==="comment"||!comment.trim()}>{busy==="comment"?<Loader2 size={16}/>:<MessageSquare size={16}/>}ثبت نظر ناظر</button></div>:null}
      </section>:null}
      {returnAction?<div role="dialog" aria-modal="true" aria-label="ثبت علت بازگشت" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-xl"><h2 className="mb-2 text-lg font-semibold">{returnAction.label}</h2><p className="mb-4 text-sm text-default-500">لطفاً علت بازگشت و موارد لازم برای اصلاح را ثبت کنید.</p><textarea className="input min-h-32 w-full" value={returnReason} onChange={e=>setReturnReason(e.target.value)} placeholder="علت بازگشت..." autoFocus/><div className="mt-5 flex justify-end gap-2"><button type="button" className="btn btn-outline" onClick={()=>setReturnAction(null)}>انصراف</button><button type="button" className="btn bg-amber-500 text-white hover:bg-amber-600" disabled={!returnReason.trim()||Boolean(busy)} onClick={submitReturn}>ثبت بازگشت</button></div></div></div>:null}
      {message?<div className={"alert "+(message.type==="error"?"alert-error":"alert-success")} style={{marginTop:18}}>{message.text}</div>:null}
    </>:null}
  </DashboardShell>;
}

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
  const {data:comments,mutate:mutateComments}=useSWR<SupervisorComment[]>("/program-profiles/"+id+"/supervisor-comments");
  const [busy,setBusy]=useState("");
  const [comment,setComment]=useState("");
  const {data:forecast}=useSWR<{expertIds:string[];topicAxes:{id:string;title:string}[]}>(data?.forecastId?`/forecasts/${data.forecastId}`:null);
  const [expertRows,setExpertRows]=useState<{expertId:string;topicAxisId:string;duration:string;attendanceType:number;hasPayment:boolean}[]|null>(null);
  const rows=expertRows??(data?.experts??[]).map(x=>({expertId:x.expertId,topicAxisId:x.topicAxisId,duration:String(x.duration).split(".")[0],attendanceType:({InPerson:1,Phone:2,Recorded:3,Workplace:4}[x.attendanceType]??1),hasPayment:x.hasPayment}));
  const [expertSaving,setExpertSaving]=useState(false);
  function updateExpert(index:number,patch:Partial<(typeof rows)[number]>){
    setExpertRows(rows.map((row,i)=>i===index?{...row,...patch}:row));
  }
  async function saveExperts(){
    if(!data)return;
    if(rows.some(x=>!x.expertId||!x.topicAxisId||!/^\d{2,}:([0-5]\d):([0-5]\d)$/.test(x.duration))){
      setMessage({type:"error",text:"کارشناس، محور موضوعی و مدت معتبر برای هر ردیف لازم است."});return;
    }
    setExpertSaving(true);
    try{
      await apiClient.put(`/program-profiles/${id}/experts`,{profileId:id,experts:rows});
      setExpertRows(null);await mutate();setMessage({type:"success",text:"ارتباط کارشناسان با محورهای موضوعی ثبت شد."});
    }catch(e){setMessage({type:"error",text:apiErrorMessage(e,"ثبت کارشناسان انجام نشد.")});}
    finally{setExpertSaving(false);}
  }
  const [message,setMessage]=useState<{type:"error"|"success";text:string}|null>(null);

  const activeStageRole=data?roleForStage(data):null;
  const canAct=Boolean(data&&activeStageRole&&(session?.isSystemAdmin||session?.user.roles.includes(activeStageRole)));
  const canReturn=Boolean(canAct&&data?.status!==PROFILE_STATUS.PendingSupervisor);
  const canComment=Boolean(data?.status===PROFILE_STATUS.PendingSupervisor&&activeStageRole&&(session?.isSystemAdmin||session?.user.roles.includes(activeStageRole)));
  const canSubmit=Boolean(data&&(data.status===PROFILE_STATUS.Draft||data.status===PROFILE_STATUS.ReturnedForEdit));

  async function action(name:"submit"|"approve"|"return"){
    let payload:unknown=undefined;
    if(name==="return"){
      const reason=window.prompt("دلیل بازگشت را وارد کنید:");
      if(reason===null)return;
      if(!reason.trim()){setMessage({type:"error",text:"دلیل بازگشت الزامی است."});return;}
      payload={reason:reason.trim()};
    }
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

  async function executeCustomAction(actionKey:string,label:string){
    if(!/^[a-z0-9-]{1,100}$/.test(actionKey))return;
    const reason=window.prompt(`توضیحات اقدام «${label}» (اختیاری):`);
    if(reason===null)return;
    setBusy(actionKey);setMessage(null);
    try{
      await apiClient.post("/program-profiles/"+id+"/actions/"+actionKey,{reason});
      await mutate();await refreshActions();
      setMessage({type:"success",text:"اقدام با موفقیت انجام شد."});
    }catch(error){setMessage({type:"error",text:apiErrorMessage(error,"اجرای اقدام انجام نشد.")});}
    finally{setBusy("");}
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
    <Breadcrumb items={[{label:"داشبورد",href:"/dashboard"},{label:"شناسنامه عملکرد",href:"/program-profiles"},{label:"جزئیات"}]}/>
    {isLoading?<div className="card">در حال دریافت شناسنامه...</div>:null}
    {error?<div className="alert alert-error">دریافت شناسنامه انجام نشد.</div>:null}
    {data?<><div className="page-head"><div><h1 className="page-title">{data.mainTopic}</h1><p className="page-description">طرح #{data.planId} — {profileStatusLabel(data.status,data.statusDisplayName)}</p></div><span className="admin-badge">{profileStatusLabel(data.status,data.statusDisplayName)}</span></div>
      <div className="grid grid-2">
        <section className="card"><h2 style={{fontSize:16}}>اطلاعات برنامه</h2>
          <p>نوع برنامه: {data.programTypeName}</p><p>نحوه تولید: {data.productionMethod}</p><p>مناسبت: {data.occasion}</p>
          <p>تاریخ پخش: {new Date(data.broadcastDate).toLocaleString("fa-IR")}</p><p>مدت: {data.duration}</p><p>ساعت شروع: {data.startTime}</p>
          <p>ساختار: {data.programStructureName}</p><p>درجه: {data.programDegreeName}</p><p>طبقه: {data.floorName}</p>
        </section>
        <section className="card"><h2 style={{fontSize:16}}>گردش‌کار</h2>
          {canSubmit?<p className="muted">شناسنامه نزد تهیه‌کننده است. برای ورود به گردش‌کار، دکمه «ارسال به گردش‌کار» را بزنید.</p>:null}
          <p className="muted">مرحله فعلی: {profileStatusLabel(data.status,data.statusDisplayName)}</p>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:14}}>
            {canSubmit?<button className="btn btn-primary" onClick={()=>action("submit")} disabled={Boolean(busy)}>{busy==="submit"?<Loader2 size={16}/>:<Send size={16}/>}ارسال به گردش‌کار</button>:null}
            {canAct&&permittedActions?.some(x=>x.key==="approve")?<button className="btn btn-primary" onClick={()=>action("approve")} disabled={Boolean(busy)}>{busy==="approve"?<Loader2 size={16}/>:<CheckCircle2 size={16}/>}تایید مرحله</button>:null}
            {canReturn&&permittedActions?.some(x=>x.key==="return-for-edit")?<button className="btn btn-outline" onClick={()=>action("return")} disabled={Boolean(busy)}>{busy==="return"?<Loader2 size={16}/>:<Undo2 size={16}/>}بازگشت</button>:null}
            {(permittedActions??[]).filter(x=>!["submit","approve","return-for-edit"].includes(x.key)).map(x=>
              <button key={x.transitionId} className="btn btn-outline" onClick={()=>executeCustomAction(x.key,x.label)} disabled={Boolean(busy)}>{x.label}</button>
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-2" style={{marginTop:18}}>
        <section className="card"><h2 style={{fontSize:16}}>عوامل برنامه</h2>
          {(data.crewMembers??[]).map(x=><div key={x.id??x.personnelId} style={{padding:"8px 0",borderBottom:"1px solid var(--border)"}}>{x.personnelName} — {x.activityTypeName} — {x.isPresent?"حاضر":"غایب"}</div>)}
          {!data.crewMembers?.length?<div className="muted">عاملی ثبت نشده است.</div>:null}
        </section>
        <section className="card"><h2 style={{fontSize:16}}>آیتم‌های برنامه</h2>
          {(data.items??[]).map(x=><div key={x.id??x.itemName} style={{padding:"8px 0",borderBottom:"1px solid var(--border)"}}>{x.itemName} — {x.productionType} — {x.duration}</div>)}
          {!data.items?.length?<div className="muted">آیتمی ثبت نشده است.</div>:null}
        </section>
      </div>

      <section className="card" style={{marginTop:18}}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">کارشناسان و محورهای موضوعی</h2><p className="text-sm text-default-500">اتصال هر کارشناس پیش‌بینی به محور موضوعی، مدت و نوع حضور</p></div><button type="button" className="btn btn-outline" onClick={()=>setExpertRows([...rows,{expertId:"",topicAxisId:"",duration:"00:05:00",attendanceType:1,hasPayment:false}])}>افزودن ارتباط</button></div>
        <div className="overflow-x-auto"><table className="w-full text-right text-sm"><thead className="bg-default-50"><tr><th className="p-3">کارشناس</th><th className="p-3">محور موضوعی</th><th className="p-3">مدت</th><th className="p-3">نوع حضور</th><th className="p-3">پرداخت</th><th className="p-3"></th></tr></thead><tbody>
          {rows.map((row,i)=><tr key={i} className="border-b border-default-200">
            <td className="p-2"><select className="select" value={row.expertId} onChange={e=>updateExpert(i,{expertId:e.target.value})}><option value="">انتخاب کارشناس</option>{(forecast?.expertIds??[]).map(expertId=><option key={expertId} value={expertId}>{expertId}</option>)}</select></td>
            <td className="p-2"><select className="select" value={row.topicAxisId} onChange={e=>updateExpert(i,{topicAxisId:e.target.value})}><option value="">انتخاب محور</option>{(forecast?.topicAxes??[]).map(axis=><option key={axis.id} value={axis.id}>{axis.title}</option>)}</select></td>
            <td className="p-2"><input className="input" dir="ltr" value={row.duration} onChange={e=>updateExpert(i,{duration:e.target.value})}/></td>
            <td className="p-2"><select className="select" value={row.attendanceType} onChange={e=>updateExpert(i,{attendanceType:Number(e.target.value)})}><option value={1}>حضوری</option><option value={2}>تلفنی</option><option value={3}>ضبط‌شده</option><option value={4}>محل کار</option></select></td>
            <td className="p-2"><input type="checkbox" checked={row.hasPayment} onChange={e=>updateExpert(i,{hasPayment:e.target.checked})}/></td>
            <td className="p-2"><button type="button" className="btn btn-outline" onClick={()=>setExpertRows(rows.filter((_,j)=>i!==j))}>حذف</button></td>
          </tr>)}
        </tbody></table></div>
        <div className="mt-4 flex justify-end"><button type="button" className="btn btn-primary" disabled={expertSaving||!forecast} onClick={saveExperts}>{expertSaving?"در حال ذخیره...":"ثبت ارتباط کارشناسان"}</button></div>
      </section>
      <section className="card" style={{marginTop:18}}>
        <h2 style={{fontSize:16}}>نظرات ناظر</h2>
        {(comments??[]).map(c=><div key={c.id} style={{padding:"10px 0",borderBottom:"1px solid var(--border)"}}><strong>{c.supervisorName}</strong><div className="muted" style={{fontSize:11}}>{new Date(c.createdDate).toLocaleString("fa-IR")}</div><p style={{marginBottom:0}}>{c.comment}</p></div>)}
        {canComment?<div style={{marginTop:16}}><textarea className="input" style={{height:100,paddingTop:10,width:"100%"}} value={comment} onChange={e=>setComment(e.target.value)} placeholder="نظر ناظر را وارد کنید"/><button className="btn btn-primary" style={{marginTop:10}} onClick={saveComment} disabled={busy==="comment"||!comment.trim()}>{busy==="comment"?<Loader2 size={16}/>:<MessageSquare size={16}/>}ثبت نظر ناظر</button></div>:null}
      </section>

      {message?<div className={"alert "+(message.type==="error"?"alert-error":"alert-success")} style={{marginTop:18}}>{message.text}</div>:null}
    </>:null}
  </DashboardShell>;
}

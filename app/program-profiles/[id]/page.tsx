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
  const {data:comments,mutate:mutateComments}=useSWR<SupervisorComment[]>("/program-profiles/"+id+"/supervisor-comments");
  const [busy,setBusy]=useState("");
  const [comment,setComment]=useState("");
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
      await mutate();
      setMessage({type:"success",text:"عملیات با موفقیت انجام شد."});
    }catch(e){setMessage({type:"error",text:apiErrorMessage(e,"عملیات انجام نشد.")});}
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
          <p className="muted">مرحله فعلی: {profileStatusLabel(data.status,data.statusDisplayName)}</p>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:14}}>
            {canSubmit?<button className="btn btn-primary" onClick={()=>action("submit")} disabled={Boolean(busy)}>{busy==="submit"?<Loader2 size={16}/>:<Send size={16}/>}ارسال</button>:null}
            {canAct?<button className="btn btn-primary" onClick={()=>action("approve")} disabled={Boolean(busy)}>{busy==="approve"?<Loader2 size={16}/>:<CheckCircle2 size={16}/>}تایید مرحله</button>:null}
            {canReturn?<button className="btn btn-outline" onClick={()=>action("return")} disabled={Boolean(busy)}>{busy==="return"?<Loader2 size={16}/>:<Undo2 size={16}/>}بازگشت</button>:null}
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
        <h2 style={{fontSize:16}}>نظرات ناظر</h2>
        {(comments??[]).map(c=><div key={c.id} style={{padding:"10px 0",borderBottom:"1px solid var(--border)"}}><strong>{c.supervisorName}</strong><div className="muted" style={{fontSize:11}}>{new Date(c.createdDate).toLocaleString("fa-IR")}</div><p style={{marginBottom:0}}>{c.comment}</p></div>)}
        {canComment?<div style={{marginTop:16}}><textarea className="input" style={{height:100,paddingTop:10,width:"100%"}} value={comment} onChange={e=>setComment(e.target.value)} placeholder="نظر ناظر را وارد کنید"/><button className="btn btn-primary" style={{marginTop:10}} onClick={saveComment} disabled={busy==="comment"||!comment.trim()}>{busy==="comment"?<Loader2 size={16}/>:<MessageSquare size={16}/>}ثبت نظر ناظر</button></div>:null}
      </section>

      {message?<div className={"alert "+(message.type==="error"?"alert-error":"alert-success")} style={{marginTop:18}}>{message.text}</div>:null}
    </>:null}
  </DashboardShell>;
}

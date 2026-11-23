"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import useSWR from "swr";
import { Camera, Loader2, Save, ShieldCheck, UserRound } from "lucide-react";
import DashboardShell, { Breadcrumb } from "@/components/layout/dashboard-shell";
import { useSession } from "@/hooks/use-session";
import type { UserProfileResponse } from "@/lib/auth/types";
import { apiClient, apiErrorMessage } from "@/lib/http/client";
import { showToast } from "@/lib/ui/toast";

export default function ProfilePage() {
  const { data: session, mutate: refreshSession } = useSession();
  const { data: profile, error, isLoading, mutate } = useSWR<UserProfileResponse>("/auth/profile");
  const [values, setValues] = useState({ fullName: "", email: "", phoneNumber: "" });
  const [errors, setErrors] = useState<Record<string,string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profile) return;
    setValues({
      fullName: profile.fullName ?? "",
      email: profile.email ?? "",
      phoneNumber: profile.phoneNumber ?? "",
    });
  }, [profile]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation: Record<string,string> = {};
    if (!values.fullName.trim()) validation.fullName = "نام و نام خانوادگی الزامی است.";
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) validation.email = "آدرس ایمیل معتبر نیست.";
    setErrors(validation);
    if (Object.keys(validation).length) return;

    setSaving(true);
    setMessage("");
    try {
      await apiClient.put("/auth/profile", {
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        phoneNumber: values.phoneNumber.trim() || null,
      });
      await Promise.all([mutate(), refreshSession()]);
      showToast({ type: "success", message: "اطلاعات پروفایل ذخیره شد." });
    } catch (cause) {
      setMessage(apiErrorMessage(cause, "ویرایش پروفایل انجام نشد."));
    } finally {
      setSaving(false);
    }
  }

  async function uploadPicture(file: File | null) {
    if (!file) return;
    if (!["image/png","image/jpeg","image/webp"].includes(file.type) || file.size > 2*1024*1024) {
      setMessage("تصویر باید JPG، PNG یا WEBP و حداکثر ۲ مگابایت باشد.");
      return;
    }
    setUploading(true);
    setMessage("");
    try {
      const data = new FormData();
      data.set("file",file);
      await apiClient.post("/auth/profile/picture",data);
      await Promise.all([mutate(),refreshSession()]);
      showToast({ type:"success",message:"تصویر پروفایل به‌روزرسانی شد." });
    } catch(cause) {
      setMessage(apiErrorMessage(cause,"بارگذاری تصویر ناموفق بود."));
    } finally {
      setUploading(false);
      if(fileRef.current) fileRef.current.value="";
    }
  }

  return <DashboardShell>
    <Breadcrumb items={[{label:"داشبورد",href:"/dashboard"},{label:"پروفایل من"}]}/>
    <div className="page-head">
      <div><h1 className="page-title">پروفایل کاربری</h1>
        <p className="page-description">مشاهده و ویرایش اطلاعات حساب خود</p>
      </div>
    </div>
    {isLoading ? <div className="card">در حال دریافت اطلاعات پروفایل...</div> : null}
    {error ? <div className="alert alert-error">دریافت اطلاعات پروفایل ناموفق بود.</div> : null}
    {message ? <div role="alert" className="alert alert-error mb-5">{message}</div> : null}
    {profile ? <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(250px,1fr)]">
      <form onSubmit={save} noValidate className="form-section">
        <div className="form-section-head"><strong>اطلاعات شخصی</strong></div>
        <div className="form-section-body">
          <div className="form-grid">
            <label className="field"><span className="label">نام و نام خانوادگی *</span>
              <input className="input" value={values.fullName} aria-invalid={Boolean(errors.fullName)}
                onChange={event=>{setValues(prev=>({...prev,fullName:event.target.value}));setErrors(prev=>({...prev,fullName:""}));}}/>
              {errors.fullName?<span role="alert">{errors.fullName}</span>:null}
            </label>
            <label className="field"><span className="label">نام کاربری</span>
              <input className="input bg-muted" value={profile.userName} disabled dir="ltr"/>
            </label>
            <label className="field"><span className="label">ایمیل</span>
              <input className="input" type="email" dir="ltr" value={values.email} aria-invalid={Boolean(errors.email)}
                onChange={event=>{setValues(prev=>({...prev,email:event.target.value}));setErrors(prev=>({...prev,email:""}));}}/>
              {errors.email?<span role="alert">{errors.email}</span>:null}
            </label>
            <label className="field"><span className="label">شماره تماس</span>
              <input className="input" dir="ltr" value={values.phoneNumber} onChange={event=>setValues(prev=>({...prev,phoneNumber:event.target.value}))}/>
            </label>
          </div>
          <div className="mt-6 flex justify-end"><button className="btn btn-primary" type="submit" disabled={saving}>
            {saving?<Loader2 className="size-4 animate-spin"/>:<Save className="size-4"/>}
            {saving?"در حال ذخیره...":"ذخیره تغییرات"}
          </button></div>
        </div>
      </form>

      <div className="grid content-start gap-5">
        <section className="card text-center">
          <div className="mx-auto grid size-24 place-items-center overflow-hidden rounded-2xl bg-primary/10 text-primary">
            {profile.profilePictureUrl ? <img key={profile.profilePictureUrl} alt="تصویر پروفایل" src="/api/auth/profile/picture/view" className="size-full object-cover"/> : <UserRound className="size-10"/>}
          </div>
          <h2 className="mt-4 text-base font-bold">{profile.fullName||profile.userName}</h2>
          <p className="mt-1 text-xs text-muted-foreground" dir="ltr">@{profile.userName}</p>
          <input ref={fileRef} type="file" className="sr-only" accept="image/png,image/jpeg,image/webp" onChange={event=>void uploadPicture(event.target.files?.[0]??null)}/>
          <button type="button" className="btn btn-outline mt-4" disabled={uploading} onClick={()=>fileRef.current?.click()}>
            {uploading?<Loader2 className="size-4 animate-spin"/>:<Camera className="size-4"/>} تغییر تصویر
          </button>
          <p className="mt-3 text-xs text-muted-foreground">فرمت JPG، PNG یا WEBP · حداکثر ۲ مگابایت</p>
        </section>
        <section className="card">
          <div className="mb-3 flex items-center gap-2 font-bold"><ShieldCheck className="size-5 text-primary"/>سطح دسترسی</div>
          <div className="flex flex-wrap gap-2">
            {(session?.roleLabels??profile.roleLabels??[]).map(role=><span key={role} className="admin-badge">{role}</span>)}
          </div>
        </section>
      </div>
    </div> : null}
  </DashboardShell>;
}

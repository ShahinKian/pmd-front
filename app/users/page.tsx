"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { KeyRound, Pencil, Plus, Save, ShieldAlert, X } from "lucide-react";
import DashboardShell, { Breadcrumb } from "@/components/layout/dashboard-shell";
import { useSession } from "@/hooks/use-session";
import { apiClient, apiErrorMessage } from "@/lib/http/client";
import { showToast } from "@/lib/ui/toast";
import type { BaseInfoListResponse } from "@/lib/base-info/browser-types";
import { roleLabel } from "@/lib/auth/roles";

interface AdminUser {
  id: string;
  fullName: string;
  userName: string;
  email: string | null;
  phoneNumber: string | null;
  isActive: boolean;
  providerId: number | null;
  networkGroupId: number | null;
  networkIds: number[];
  roles: string[];
}

export default function UsersPage() {
  const { data: session, isLoading: sessionLoading } = useSession();
  const { data: users, error, isLoading, mutate } = useSWR<AdminUser[]>(
    session?.isSystemAdmin ? "/auth/users" : null,
  );
  const { data: providers } = useSWR<BaseInfoListResponse>(
    session?.isSystemAdmin ? "/base-info/providers" : null,
  );

  const providerOptions = useMemo(
    () => (providers?.Data ?? [])
      .map(x => ({ id: Number(x.Value), text: x.Text, disabled: x.Disabled }))
      .filter(x => Number.isInteger(x.id) && x.id > 0),
    [providers],
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{fullName:string;phoneNumber:string;isActive:boolean;providerId:string}>({
    fullName:"", phoneNumber:"", isActive:true, providerId:"",
  });
  const [passwordUser, setPasswordUser] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  function beginEdit(user: AdminUser) {
    setEditingId(user.id);
    setDraft({
      fullName:user.fullName,
      phoneNumber:user.phoneNumber ?? "",
      isActive:user.isActive,
      providerId:user.providerId ? String(user.providerId) : "",
    });
  }

  async function saveUser(user: AdminUser) {
    if (!draft.fullName.trim()) {
      showToast({type:"error", message:"نام و نام خانوادگی الزامی است."});
      return;
    }
    setSaving(true);
    try {
      await apiClient.put(`/auth/users/${user.id}`, {
        fullName: draft.fullName.trim(),
        phoneNumber: draft.phoneNumber.trim() || null,
        isActive: draft.isActive,
        providerId: draft.providerId ? Number(draft.providerId) : null,
      });
      setEditingId(null);
      await mutate();
      showToast({type:"success", message:"اطلاعات کاربر با موفقیت ویرایش شد."});
    } catch (e) {
      showToast({type:"error", message:apiErrorMessage(e,"ویرایش کاربر انجام نشد.")});
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword() {
    if (!passwordUser) return;
    if (newPassword.length < 8) {
      showToast({type:"error", message:"رمز عبور جدید باید حداقل ۸ کاراکتر باشد."});
      return;
    }
    setSaving(true);
    try {
      await apiClient.post(`/auth/users/${passwordUser.id}/reset-password`, { newPassword });
      showToast({type:"success", message:`کلمه عبور «${passwordUser.fullName}» با موفقیت تغییر کرد.`});
      setPasswordUser(null);
      setNewPassword("");
    } catch (e) {
      showToast({type:"error", message:apiErrorMessage(e,"تغییر کلمه عبور انجام نشد.")});
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell>
      <Breadcrumb items={[{ label: "داشبورد", href: "/dashboard" }, { label: "مدیریت کاربران" }]} />
      <div className="page-head">
        <div>
          <h1 className="page-title">مدیریت کاربران</h1>
          <p className="page-description">فهرست کاربران، ویرایش اطلاعات و تغییر کلمه عبور</p>
        </div>
        {session?.isSystemAdmin ? (
          <Link href="/users/new" className="btn btn-primary"><Plus size={17}/>تعریف کاربر جدید</Link>
        ) : null}
      </div>

      {sessionLoading ? <div className="card">در حال بررسی دسترسی...</div> : null}
      {session && !session.isSystemAdmin ? (
        <div className="alert alert-error"><ShieldAlert size={16} className="inline ml-2"/>دسترسی به مدیریت کاربران فقط برای مدیر سیستم مجاز است.</div>
      ) : null}

      {session?.isSystemAdmin ? (
        <section className="card" style={{padding:0,overflow:"hidden"}}>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-default-50">
                <tr>
                  <th className="p-3">نام و نام خانوادگی</th>
                  <th className="p-3">نام کاربری</th>
                  <th className="p-3">نقش‌ها</th>
                  <th className="p-3">شماره تماس</th>
                  <th className="p-3">تهیه‌کننده</th>
                  <th className="p-3">وضعیت</th>
                  <th className="p-3">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-default-100">
                {(users ?? []).map(user => {
                  const editing = editingId === user.id;
                  const providerName = providerOptions.find(x => x.id === user.providerId)?.text;
                  return (
                    <tr key={user.id}>
                      <td className="p-3">
                        {editing ? <input className="input min-w-48" value={draft.fullName} onChange={e=>setDraft(x=>({...x,fullName:e.target.value}))}/> : <strong>{user.fullName}</strong>}
                      </td>
                      <td className="p-3" dir="ltr">{user.userName}</td>
                      <td className="p-3">{user.roles.map(roleLabel).join("، ") || "—"}</td>
                      <td className="p-3">
                        {editing ? <input className="input min-w-36" dir="ltr" value={draft.phoneNumber} onChange={e=>setDraft(x=>({...x,phoneNumber:e.target.value}))}/> : (user.phoneNumber || "—")}
                      </td>
                      <td className="p-3">
                        {editing ? (
                          <select className="select min-w-48" value={draft.providerId} onChange={e=>setDraft(x=>({...x,providerId:e.target.value}))}>
                            <option value="">بدون تهیه‌کننده</option>
                            {providerOptions.map(p=><option key={p.id} value={p.id} disabled={p.disabled}>{p.text}</option>)}
                          </select>
                        ) : (providerName || "—")}
                      </td>
                      <td className="p-3">
                        {editing ? (
                          <label className="flex items-center gap-2">
                            <input type="checkbox" checked={draft.isActive} onChange={e=>setDraft(x=>({...x,isActive:e.target.checked}))}/>
                            فعال
                          </label>
                        ) : (
                          <span className={`rounded-full px-2 py-1 text-xs ${user.isActive?"bg-green-100 text-green-700":"bg-red-100 text-red-700"}`}>
                            {user.isActive?"فعال":"غیرفعال"}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          {editing ? (
                            <>
                              <button className="btn btn-primary" disabled={saving} onClick={()=>saveUser(user)}><Save size={15}/>ذخیره</button>
                              <button className="btn btn-outline" disabled={saving} onClick={()=>setEditingId(null)}><X size={15}/>انصراف</button>
                            </>
                          ) : (
                            <button className="btn btn-outline" onClick={()=>beginEdit(user)}><Pencil size={15}/>ویرایش</button>
                          )}
                          <button className="btn btn-outline" onClick={()=>{setPasswordUser(user);setNewPassword("");}}><KeyRound size={15}/>تغییر رمز</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {isLoading ? <div className="p-6 muted">در حال دریافت کاربران...</div> : null}
          {error ? <div className="alert alert-error m-4">دریافت کاربران انجام نشد.</div> : null}
          {!isLoading && !error && (users?.length ?? 0) === 0 ? <div className="p-8 text-center muted">کاربری برای نمایش وجود ندارد.</div> : null}
        </section>
      ) : null}

      {passwordUser ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4" onClick={()=>setPasswordUser(null)}>
          <div className="card w-full max-w-md" onClick={e=>e.stopPropagation()}>
            <h2 className="text-lg font-semibold">تغییر کلمه عبور</h2>
            <p className="muted mt-1 mb-4">{passwordUser.fullName}</p>
            <label className="field">
              <span className="label">رمز عبور جدید</span>
              <input className="input" type="password" dir="ltr" value={newPassword} onChange={e=>setNewPassword(e.target.value)} minLength={8}/>
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn btn-outline" disabled={saving} onClick={()=>setPasswordUser(null)}>انصراف</button>
              <button className="btn btn-primary" disabled={saving} onClick={resetPassword}><KeyRound size={16}/>تغییر کلمه عبور</button>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardShell>
  );
}

"use client";

import { useRef, useState, type FormEvent } from "react";
import { ArrowDownUp, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import useSWR, { useSWRConfig } from "swr";
import DashboardShell, { Breadcrumb } from "@/components/layout/dashboard-shell";
import { useSession } from "@/hooks/use-session";
import { roleLabel } from "@/lib/auth/roles";
import { apiClient, apiErrorMessage } from "@/lib/http/client";

import type { RoleResponse } from "@/lib/auth/types";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const rolesPath = "/auth/roles";

export default function RolesPage() {
  const { data: session, isLoading: sessionLoading, error: sessionError } = useSession();
  const { mutate } = useSWRConfig();
  const roles = useSWR<RoleResponse[]>(session?.isSystemAdmin ? rolesPath : null);
  const [editing, setEditing] = useState<RoleResponse | null>(null);
  const [deleteTarget,setDeleteTarget]=useState<RoleResponse|null>(null);
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sort,setSort] = useState<{key:"label"|"name"|"type";direction:"asc"|"desc"}>({key:"label",direction:"asc"});
  function toggleSort(key:typeof sort.key){setSort(current=>({key,direction:current.key===key&&current.direction==="asc"?"desc":"asc"}));}
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const displayNameInput = useRef<HTMLInputElement>(null);

  function edit(role: RoleResponse | null) {
    setEditing(role);
    setName(role?.name ?? "");
    setDisplayName(role ? roleLabel(role) : "");
    setNotice(null);
    displayNameInput.current?.focus();
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    const title = displayName.trim();
    if (busy || !trimmed || !title) return;

    setBusy(true);
    setNotice(null);
    try {
      const { data: saved } = editing
        ? await apiClient.put<RoleResponse>(`${rolesPath}/${editing.id}`, { name: trimmed, displayName: title })
        : await apiClient.post<RoleResponse>(rolesPath, { name: trimmed, displayName: title });
      await roles.mutate((current = []) => [...current.filter((role) => role.id !== saved.id), saved]);
      void mutate("/auth/session");
      setEditing(null);
      setName("");
      setDisplayName("");
      setNotice({ text: editing ? "نقش ویرایش شد." : "نقش جدید ایجاد شد." });
    } catch (cause) {
      setNotice({ text: apiErrorMessage(cause, "ذخیره نقش انجام نشد."), error: true });
    } finally {
      setBusy(false);
    }
  }

  async function remove(role: RoleResponse) {
    if (busy) return;

    setBusy(true);
    setNotice(null);
    try {
      await apiClient.delete(`${rolesPath}/${role.id}`);
      setDeleteTarget(null);
      await roles.mutate((current) => current?.filter((item) => item.id !== role.id));
      if (editing?.id === role.id) edit(null);
      setNotice({ text: "نقش حذف شد." });
    } catch (cause) {
      setNotice({ text: apiErrorMessage(cause, "حذف نقش انجام نشد."), error: true });
    } finally {
      setBusy(false);
    }
  }

  const error = sessionError || roles.error;
  const items = roles.data && [...roles.data].sort((left, right) => {
    const value = (role:RoleResponse) => sort.key==="label"?roleLabel(role):sort.key==="type"?(role.isSystemRole?"سیستمی":"سفارشی"):role.name;
    const result=value(left).localeCompare(value(right),"fa",{numeric:true});
    return sort.direction==="asc"?result:-result;
  });

  return <DashboardShell>
    <Breadcrumb items={[{ label: "داشبورد", href: "/dashboard" }, { label: "مدیریت نقش‌ها" }]} />
    <div className="page-head"><h1 className="page-title">مدیریت نقش‌ها</h1></div>
    {(sessionLoading || roles.isLoading) && <p role="status">در حال بارگذاری…</p>}
    {session && !session.isSystemAdmin && <p role="alert">مدیریت نقش‌ها در دسترسی مدیر سیستم است.</p>}
    {error && <p className="alert alert-error" role="alert">{apiErrorMessage(error, "فهرست نقش‌ها دریافت نشد.")}</p>}
    {session?.isSystemAdmin && <div className="grid gap-4">
      <form className="card grid gap-3" onSubmit={save}>
        <h2 className="font-semibold">{editing ? "ویرایش نقش" : "ایجاد نقش جدید"}</h2>
        <div className="form-grid">
          <label className="field">
            <span className="label">نام فنی نقش</span>
            <input className="input" dir="auto" value={name} required maxLength={256}
              disabled={busy} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="field">
            <span className="label">نام نمایشی فارسی</span>
            <input ref={displayNameInput} className="input" dir="auto" value={displayName} required maxLength={256}
              disabled={busy} onChange={(event) => setDisplayName(event.target.value)} />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-success" type="submit" disabled={busy || !name.trim() || !displayName.trim()}>
            {editing ? <><Save size={16} aria-hidden />ذخیره تغییرات</> : <><Plus size={16} aria-hidden />ایجاد نقش</>}
          </button>
          {editing && <button className="btn btn-outline" type="button" disabled={busy} onClick={() => edit(null)}><X size={15} aria-hidden />انصراف</button>}
        </div>
        {notice && <p className={`alert ${notice.error ? "alert-error" : "alert-success"}`}
          role={notice.error ? "alert" : "status"}>{notice.text}</p>}
      </form>
      {items?.length === 0 && <p>هنوز نقشی ثبت نشده است.</p>}
      {items && items.length > 0 && <section className="panel table-scroll" aria-label="فهرست نقش‌ها">
        <table className="data-table">
          <thead><tr><th scope="col"><button type="button" className="pmd-sort-button" onClick={()=>toggleSort("label")}>نام نمایشی<ArrowDownUp size={14} aria-hidden/>{sort.key==="label"?<span>{sort.direction==="asc"?"↑":"↓"}</span>:null}</button></th><th scope="col"><button type="button" className="pmd-sort-button" onClick={()=>toggleSort("name")}>نام فنی<ArrowDownUp size={14} aria-hidden/>{sort.key==="name"?<span>{sort.direction==="asc"?"↑":"↓"}</span>:null}</button></th><th scope="col"><button type="button" className="pmd-sort-button" onClick={()=>toggleSort("type")}>نوع<ArrowDownUp size={14} aria-hidden/>{sort.key==="type"?<span>{sort.direction==="asc"?"↑":"↓"}</span>:null}</button></th><th scope="col">عملیات</th></tr></thead>
          <tbody>{items.map((role) => <tr className="border-t" key={role.id}>
            <td><bdi>{roleLabel(role)}</bdi></td>
            <td><bdi>{role.name}</bdi></td>
            <td>{role.isSystemRole ? "سیستمی" : "سفارشی"}</td>
            <td><div className="flex flex-wrap gap-2">
              <button className="btn btn-outline" type="button" disabled={busy}
                aria-label={`ویرایش ${roleLabel(role)}`} onClick={() => edit(role)}><Pencil size={15} aria-hidden />ویرایش</button>
              {!role.isSystemRole && <button className="btn btn-danger" type="button" disabled={busy}
                aria-label={`حذف ${roleLabel(role)}`} onClick={() => setDeleteTarget(role)}><Trash2 size={15} aria-hidden />حذف</button>}
            </div></td>
          </tr>)}</tbody>
        </table>
      </section>}
    </div>}
    <ConfirmDialog
      open={Boolean(deleteTarget)}
      title="حذف نقش"
      description={deleteTarget ? `نقش «${roleLabel(deleteTarget)}» حذف شود؟` : ""}
      confirmLabel="حذف نقش"
      destructive
      busy={busy}
      onCancel={() => setDeleteTarget(null)}
      onConfirm={() => deleteTarget ? remove(deleteTarget) : undefined}
    />
  </DashboardShell>;
}

"use client";

import { useRef, useState, type FormEvent } from "react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import useSWR from "swr";
import DashboardShell, { Breadcrumb } from "@/components/layout/dashboard-shell";
import { useSession } from "@/hooks/use-session";
import { roleLabel } from "@/lib/auth/roles";
import { apiClient, apiErrorMessage } from "@/lib/http/client";

interface Role {
  id: string;
  name: string;
  isSystemRole: boolean;
}

const rolesPath = "/auth/roles";

export default function RolesPage() {
  const { data: session, isLoading: sessionLoading, error: sessionError } = useSession();
  const roles = useSWR<Role[]>(session?.isSystemAdmin ? rolesPath : null);
  const [editing, setEditing] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const nameInput = useRef<HTMLInputElement>(null);

  function edit(role: Role | null) {
    setEditing(role);
    setName(role?.name ?? "");
    setNotice(null);
    nameInput.current?.focus();
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (busy || !trimmed) return;

    setBusy(true);
    setNotice(null);
    try {
      const { data: saved } = editing
        ? await apiClient.put<Role>(`${rolesPath}/${editing.id}`, { name: trimmed })
        : await apiClient.post<Role>(rolesPath, { name: trimmed });
      await roles.mutate((current = []) => [...current.filter((role) => role.id !== saved.id), saved]);
      setEditing(null);
      setName("");
      setNotice({ text: editing ? "نقش ویرایش شد." : "نقش جدید ایجاد شد." });
    } catch (cause) {
      setNotice({ text: apiErrorMessage(cause, "ذخیره نقش انجام نشد."), error: true });
    } finally {
      setBusy(false);
    }
  }

  async function remove(role: Role) {
    if (busy || !window.confirm(`نقش «${role.name}» حذف شود؟`)) return;

    setBusy(true);
    setNotice(null);
    try {
      await apiClient.delete(`${rolesPath}/${role.id}`);
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
  const items = roles.data && [...roles.data].sort((left, right) => roleLabel(left.name).localeCompare(roleLabel(right.name), "fa"));

  return <DashboardShell>
    <Breadcrumb items={[{ label: "داشبورد", href: "/dashboard" }, { label: "مدیریت نقش‌ها" }]} />
    <div className="page-head"><h1 className="page-title">مدیریت نقش‌ها</h1></div>
    {(sessionLoading || roles.isLoading) && <p role="status">در حال بارگذاری…</p>}
    {session && !session.isSystemAdmin && <p role="alert">مدیریت نقش‌ها در دسترسی مدیر سیستم است.</p>}
    {error && <p className="alert alert-error" role="alert">{apiErrorMessage(error, "فهرست نقش‌ها دریافت نشد.")}</p>}
    {session?.isSystemAdmin && <div className="grid gap-4">
      <form className="card grid gap-3" onSubmit={save}>
        <h2 className="font-semibold">{editing ? "ویرایش نقش" : "ایجاد نقش جدید"}</h2>
        <label className="field max-w-lg">
          <span className="label">نام نقش</span>
          <input ref={nameInput} className="input" dir="auto" value={name} required maxLength={256}
            disabled={busy} onChange={(event) => setName(event.target.value)} />
        </label>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-success" type="submit" disabled={busy || !name.trim()}>
            {editing ? <><Save size={16} aria-hidden />ذخیره تغییرات</> : <><Plus size={16} aria-hidden />ایجاد نقش</>}
          </button>
          {editing && <button className="btn btn-outline" type="button" disabled={busy} onClick={() => edit(null)}><X size={15} aria-hidden />انصراف</button>}
        </div>
        {notice && <p className={`alert ${notice.error ? "alert-error" : "alert-success"}`}
          role={notice.error ? "alert" : "status"}>{notice.text}</p>}
      </form>
      {items?.length === 0 && <p>هنوز نقشی ثبت نشده است.</p>}
      {items && items.length > 0 && <section className="card overflow-x-auto" aria-label="فهرست نقش‌ها">
        <table className="w-full text-right text-sm [&_td]:p-2 [&_th]:p-2">
          <thead><tr><th scope="col">نقش</th><th scope="col">نوع</th><th scope="col">عملیات</th></tr></thead>
          <tbody>{items.map((role) => <tr className="border-t" key={role.id}>
            <td><bdi>{roleLabel(role.name)}</bdi></td>
            <td>{role.isSystemRole ? "سیستمی" : "سفارشی"}</td>
            <td>{!role.isSystemRole && <div className="flex flex-wrap gap-2">
              <button className="btn btn-info" type="button" disabled={busy}
                aria-label={`ویرایش ${role.name}`} onClick={() => edit(role)}><Pencil size={15} aria-hidden />ویرایش</button>
              <button className="btn btn-danger" type="button" disabled={busy}
                aria-label={`حذف ${role.name}`} onClick={() => void remove(role)}><Trash2 size={15} aria-hidden />حذف</button>
            </div>}</td>
          </tr>)}</tbody>
        </table>
      </section>}
    </div>}
  </DashboardShell>;
}

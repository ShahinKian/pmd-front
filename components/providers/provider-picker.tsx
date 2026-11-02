"use client";

import { useState } from "react";
import { normalizeSearch } from "@/lib/base-info/search";
import type { BaseInfoListResponse } from "@/lib/base-info/browser-types";

export function ProviderPicker({ data, value, onChange, loading, error }: {
  data?: BaseInfoListResponse; value: number | null;
  onChange: (value: number | null) => void; loading: boolean; error?: unknown;
}) {
  const [query, setQuery] = useState("");
  const options = (data?.Data ?? []).filter(item => Number(item.Value) > 0);
  const selected = options.find(item => Number(item.Value) === value);
  const search = normalizeSearch(query);
  const matches = search ? options.filter(item => normalizeSearch(item.Text).includes(search)) : [];
  return <div className="space-y-3">
    <input className="input" aria-label="جست‌وجوی تهیه‌کننده" placeholder="نام تهیه‌کننده را جست‌وجو کنید..." value={query} onChange={event => setQuery(event.target.value)} />
    {value ? <div className="flex items-center justify-between gap-2 rounded border p-3">
      <span>انتخاب‌شده: {selected?.Text ?? value}</span>
      <button type="button" className="btn btn-outline" onClick={() => onChange(null)}>حذف انتخاب</button>
    </div> : null}
    {loading ? <p className="muted">در حال دریافت تهیه‌کنندگان...</p> : error ? <p role="alert">دریافت تهیه‌کنندگان ناموفق بود.</p> : !search ? <p className="muted">برای نمایش فهرست، نام را وارد کنید.</p> : <>
      <ul className="max-h-64 overflow-y-auto rounded border" aria-label="نتایج جست‌وجوی تهیه‌کننده">
        {matches.slice(0, 30).map(item => <li key={item.Value}><button type="button" className="w-full p-3 text-right hover:bg-default-100 disabled:opacity-50" disabled={item.Disabled} aria-pressed={Number(item.Value) === value} onClick={() => { onChange(Number(item.Value)); setQuery(""); }}>{item.Text}</button></li>)}
      </ul>
      {!matches.length ? <p className="muted">تهیه‌کننده‌ای یافت نشد.</p> : null}
      {matches.length > 30 ? <p className="muted">۳۰ نتیجه از {matches.length}؛ جست‌وجو را دقیق‌تر کنید.</p> : null}
    </>}
  </div>;
}

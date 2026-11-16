"use client";

import { SearchableSelect } from "@/components/ui/searchable-select";
import useSWR from "swr";
import type { SessionPayload } from "@/hooks/use-session";
import type { BaseInfoListResponse } from "@/lib/base-info/browser-types";
import { apiErrorMessage } from "@/lib/http/client";

export function NetworkSelect({
  session, value, onChange, disabled, allLabel = "انتخاب شبکه", label = "شبکه", loading = false,
}: {
  session?: SessionPayload | null;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  allLabel?: string;
  label?: string;
  loading?: boolean;
}) {
  const { data, error, isLoading } = useSWR<BaseInfoListResponse>(session ? "/base-info/networks" : null);
  const all = data?.Data ?? [];

  if (!session?.isSystemAdmin) {
    const name = all.find((item) => Number(item.Value) === Number(value))?.Text;
    return <div className="field">
      <span className="label">{label}</span>
      <div className="input" aria-readonly="true">
        {!session || loading ? "در حال دریافت شبکه…" : value ? name || `شبکه ${value}` : "شبکه‌ای تخصیص داده نشده است"}
      </div>
    </div>;
  }

  const networks = all.filter(({ Value, Disabled }) => !Disabled && Number.isSafeInteger(Number(Value)) && Number(Value) > 0);
  return <label className="field">
    <span className="label">{label}</span>
    <SearchableSelect className="select" value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled || isLoading || !networks.length}>
      <option value="">{isLoading ? "در حال بارگذاری شبکه‌ها…" : networks.length ? allLabel : "شبکه‌ای در دسترس نیست"}</option>
      {networks.map((network) => <option key={network.Value} value={String(Number(network.Value))}>{network.Text}</option>)}
    </SearchableSelect>
    {error && <span role="alert">{apiErrorMessage(error, "فهرست شبکه‌ها دریافت نشد.")}</span>}
  </label>;
}

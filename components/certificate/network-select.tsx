"use client";

import useSWR from "swr";
import type { SessionPayload } from "@/hooks/use-session";
import type { BaseInfoListResponse } from "@/lib/base-info/browser-types";
import { apiErrorMessage } from "@/lib/http/client";

export function NetworkSelect({ session, value, onChange, disabled }: {
  session: SessionPayload;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const { data, error, isLoading } = useSWR<BaseInfoListResponse>("/base-info/networks");
  const assigned = new Set(session.user.networkIds);
  const networks = (data?.Data ?? []).filter(({ Value, Disabled }) =>
    !Disabled && Number.isSafeInteger(Number(Value)) && Number(Value) > 0 &&
    (session.isSystemAdmin || assigned.has(Number(Value))));

  return <label className="field">
    <span className="label">شبکه</span>
    <select className="select" value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled || isLoading || !networks.length}>
      <option value="">{isLoading ? "در حال بارگذاری شبکه‌ها…" : networks.length ? "انتخاب شبکه" : "شبکه‌ای در دسترس نیست"}</option>
      {networks.map((network) => <option key={network.Value} value={network.Value}>{network.Text}</option>)}
    </select>
    {error && <span role="alert">{apiErrorMessage(error, "فهرست شبکه‌ها دریافت نشد.")}</span>}
  </label>;
}

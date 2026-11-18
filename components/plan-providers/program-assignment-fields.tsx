"use client";

import useSWR from "swr";
import type { BaseInfoListResponse } from "@/lib/base-info/browser-types";

export function ProgramAssignmentFields({ networkId, networkGroupId, episodeNumber }: {
  networkId?: number | null;
  networkGroupId?: number | null;
  episodeNumber?: number;
}) {
  const networks = useSWR<BaseInfoListResponse>(networkId ? "/base-info/networks" : null);
  const groups = useSWR<BaseInfoListResponse>(
    networkId ? `/base-info/network-groups/${networkId}` : null,
  );
  const networkName = networks.data?.Data.find(item => Number(item.Value) === networkId)?.Text;
  const groupName = groups.data?.Data.find(item => Number(item.Value) === networkGroupId)?.Text;

  return <>
    <label className="field">
      <span className="label">شبکه</span>
      <input className="input bg-default-50" readOnly
        value={networkId ? networkName || `شبکه ${networkId}` : ""}
        placeholder="از برنامه انتخاب‌شده" />
      {networks.error && <small role="alert" className="text-destructive">دریافت نام شبکه ناموفق بود.</small>}
    </label>
    <label className="field">
      <span className="label">گروه برنامه‌ساز</span>
      <input className="input bg-default-50" readOnly
        value={networkGroupId ? groupName || `گروه ${networkGroupId}` : ""}
        placeholder="از برنامه انتخاب‌شده" />
      {groups.error && <small role="alert" className="text-destructive">دریافت نام گروه ناموفق بود.</small>}
    </label>
    <label className="field">
      <span className="label">شماره قسمت</span>
      <input className="input bg-default-50" readOnly value={episodeNumber ?? ""}
        placeholder="از برنامه انتخاب‌شده" />
    </label>
  </>;
}

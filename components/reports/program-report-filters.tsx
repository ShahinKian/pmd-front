"use client";

import useSWR from "swr";
import type { BaseInfoListResponse } from "@/lib/base-info/browser-types";

type Props = {
  networkId: string;
  groupId: string;
  planId: string;
  onNetworkChange: (value: string) => void;
  onGroupChange: (value: string) => void;
  onPlanChange: (value: string) => void;
};

export function ProgramReportFilters({
  networkId, groupId, planId,
  onNetworkChange, onGroupChange, onPlanChange,
}: Props) {
  const { data: networks } = useSWR<BaseInfoListResponse>("/base-info/networks");
  const { data: groups } = useSWR<BaseInfoListResponse>(
    networkId ? `/base-info/network-groups/${networkId}` : null,
  );
  const { data: plans } = useSWR<BaseInfoListResponse>(
    networkId ? `/base-info/plans/${networkId}${groupId ? `?networkGroupId=${groupId}` : ""}` : null,
  );

  return (
    <>
      <label className="field">
        <span className="label">شبکه</span>
        <select className="select" value={networkId} onChange={e => {
          onNetworkChange(e.target.value);
          onGroupChange("");
          onPlanChange("");
        }}>
          <option value="">همه شبکه‌های مجاز</option>
          {(networks?.Data ?? []).map(x => <option key={x.Value} value={x.Value} disabled={x.Disabled}>{x.Text}</option>)}
        </select>
      </label>
      <label className="field">
        <span className="label">گروه</span>
        <select className="select" value={groupId} disabled={!networkId} onChange={e => {
          onGroupChange(e.target.value);
          onPlanChange("");
        }}>
          <option value="">همه گروه‌ها</option>
          {(groups?.Data ?? []).map(x => <option key={x.Value} value={x.Value} disabled={x.Disabled}>{x.Text}</option>)}
        </select>
      </label>
      <label className="field">
        <span className="label">برنامه</span>
        <select className="select" value={planId} disabled={!networkId} onChange={e => onPlanChange(e.target.value)}>
          <option value="">همه برنامه‌ها</option>
          {(plans?.Data ?? []).map(x => <option key={x.Value} value={x.Value} disabled={x.Disabled}>{x.Text}</option>)}
        </select>
      </label>
    </>
  );
}

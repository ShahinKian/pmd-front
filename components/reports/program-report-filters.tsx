"use client";

import { NetworkSelect } from "@/components/ui/network-field";
import { type SessionPayload } from "@/hooks/use-session";
import { SearchableSelect } from "@/components/ui/searchable-select";
import useSWR from "swr";
import type { BaseInfoListResponse } from "@/lib/base-info/browser-types";

type Props = {
  session?: SessionPayload | null;
  networkLoading?: boolean;
  networkId: string;
  groupId: string;
  planId: string;
  onNetworkChange: (value: string) => void;
  onGroupChange: (value: string) => void;
  onPlanChange: (value: string) => void;
};

export function ProgramReportFilters({
  session, networkLoading, networkId, groupId, planId,
  onNetworkChange, onGroupChange, onPlanChange,
}: Props) {
  const { data: groups } = useSWR<BaseInfoListResponse>(
    networkId ? `/base-info/network-groups/${networkId}` : null,
  );
  const { data: plans } = useSWR<BaseInfoListResponse>(
    networkId && groupId ? `/base-info/plans/${networkId}?networkGroupId=${groupId}` : null,
  );

  return (
    <>
      <NetworkSelect session={session} value={networkId} loading={networkLoading} allLabel="همه شبکه‌های مجاز"
        onChange={(value) => {
          onNetworkChange(value);
          onGroupChange("");
          onPlanChange("");
        }} />
      <label className="field">
        <span className="label">گروه</span>
        <SearchableSelect className="select" value={groupId} disabled={!networkId} onChange={e => {
          onGroupChange(e.target.value);
          onPlanChange("");
        }}>
          <option value="">همه گروه‌ها</option>
          {(groups?.Data ?? []).map(x => <option key={x.Value} value={x.Value} disabled={x.Disabled}>{x.Text}</option>)}
        </SearchableSelect>
      </label>
      <label className="field">
        <span className="label">برنامه</span>
        <SearchableSelect className="select" value={planId} disabled={!networkId || !groupId} onChange={e => onPlanChange(e.target.value)}>
          <option value="">{groupId ? "همه برنامه‌ها" : "ابتدا گروه را انتخاب کنید"}</option>
          {(plans?.Data ?? []).map(x => <option key={x.Value} value={x.Value} disabled={x.Disabled}>{x.Text}</option>)}
        </SearchableSelect>
      </label>
    </>
  );
}

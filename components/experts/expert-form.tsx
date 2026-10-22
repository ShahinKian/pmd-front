"use client";

import { FormEvent, useMemo, useState } from "react";
import useSWR from "swr";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { apiClient, apiErrorMessage } from "@/lib/http/client";
import type { BaseInfoListResponse } from "@/lib/base-info/browser-types";
import {
  EducationLevel,
  educationLevelLabels,
  type ExpertResponse,
} from "@/lib/experts/types";

interface ExpertFormProps {
  expert?: ExpertResponse;
  onSaved: (expert: ExpertResponse) => void;
}

function toPositiveInt(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function ExpertForm({ expert, onSaved }: ExpertFormProps) {
  const { data: networks, isLoading: networksLoading } =
    useSWR<BaseInfoListResponse>("/base-info/networks");

  const [networkIds, setNetworkIds] = useState<number[]>(expert?.networkIds ?? []);
  const [isActive, setIsActive] = useState(expert?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const networkOptions = useMemo(
    () =>
      (networks?.Data ?? [])
        .map((item) => ({ id: toPositiveInt(item.Value), label: item.Text, disabled: item.Disabled }))
        .filter((item): item is { id: number; label: string; disabled: boolean } => item.id !== null),
    [networks],
  );

  function toggleNetwork(id: number, checked: boolean) {
    setNetworkIds((current) =>
      checked ? Array.from(new Set([...current, id])) : current.filter((item) => item !== id),
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (networkIds.length === 0) {
      setError("حداقل یک شبکه برای کارشناس انتخاب کنید.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const payload = {
      firstName: String(form.get("firstName") ?? "").trim(),
      lastName: String(form.get("lastName") ?? "").trim(),
      specialty: String(form.get("specialty") ?? "").trim(),
      education: Number(form.get("education")) as EducationLevel,
      workplace: String(form.get("workplace") ?? "").trim(),
      mobilePhone: String(form.get("mobilePhone") ?? "").trim(),
      nationalCode: String(form.get("nationalCode") ?? "").trim(),
      workPhone: String(form.get("workPhone") ?? "").trim() || null,
      networkIds,
      ...(expert ? { id: expert.id, isActive } : {}),
    };

    setSaving(true);
    try {
      const response = expert
        ? await apiClient.put<ExpertResponse>(`/experts/${expert.id}`, payload)
        : await apiClient.post<ExpertResponse>("/experts", payload);
      onSaved(response.data);
    } catch (e) {
      setError(apiErrorMessage(e, "ثبت اطلاعات کارشناس انجام نشد."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="firstName" className="mb-2 text-default-600">نام *</Label>
          <Input id="firstName" name="firstName" defaultValue={expert?.firstName} required />
        </div>
        <div>
          <Label htmlFor="lastName" className="mb-2 text-default-600">نام خانوادگی *</Label>
          <Input id="lastName" name="lastName" defaultValue={expert?.lastName} required />
        </div>
        <div>
          <Label htmlFor="specialty" className="mb-2 text-default-600">تخصص *</Label>
          <Input id="specialty" name="specialty" defaultValue={expert?.specialty} required />
        </div>
        <div>
          <Label htmlFor="education" className="mb-2 text-default-600">تحصیلات *</Label>
          <select
            id="education"
            name="education"
            defaultValue={expert?.education ?? EducationLevel.Bachelor}
            className="h-10 w-full rounded-md border border-default-300 bg-background px-3 text-sm text-default-700 focus:border-primary focus:outline-none"
          >
            {Object.entries(educationLevelLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="workplace" className="mb-2 text-default-600">محل کار *</Label>
          <Input id="workplace" name="workplace" defaultValue={expert?.workplace} required />
        </div>
        <div>
          <Label htmlFor="mobilePhone" className="mb-2 text-default-600">موبایل *</Label>
          <Input id="mobilePhone" name="mobilePhone" dir="ltr" defaultValue={expert?.mobilePhone} required />
        </div>
        <div>
          <Label htmlFor="nationalCode" className="mb-2 text-default-600">کد ملی *</Label>
          <Input id="nationalCode" name="nationalCode" dir="ltr" defaultValue={expert?.nationalCode} required />
        </div>
        <div>
          <Label htmlFor="workPhone" className="mb-2 text-default-600">تلفن محل کار</Label>
          <Input id="workPhone" name="workPhone" dir="ltr" defaultValue={expert?.workPhone ?? ""} />
        </div>
      </div>

      <div>
        <div className="mb-3">
          <div className="font-medium text-default-700">شبکه‌های کارشناس *</div>
          <div className="mt-1 text-xs text-default-500">کارشناس می‌تواند به یک یا چند شبکه وابسته باشد.</div>
        </div>
        {networksLoading ? <div className="text-sm text-default-500">در حال دریافت شبکه‌ها...</div> : null}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {networkOptions.map((network) => (
            <div key={network.id} className="flex items-center justify-between rounded-xl border bg-card p-3">
              <span className="text-sm font-medium text-default-700">{network.label}</span>
              <Switch
                checked={networkIds.includes(network.id)}
                disabled={network.disabled}
                onCheckedChange={(checked) => toggleNetwork(network.id, checked)}
              />
            </div>
          ))}
        </div>
      </div>

      {expert ? (
        <div className="flex items-center justify-between rounded-xl border bg-card p-4">
          <div>
            <div className="font-medium text-default-700">وضعیت کارشناس</div>
            <div className="mt-1 text-xs text-default-500">کارشناس غیرفعال در انتخاب‌های عملیاتی استفاده نمی‌شود.</div>
          </div>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>
      ) : null}

      {error ? <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "در حال ثبت..." : expert ? "ذخیره تغییرات" : "ثبت کارشناس"}
        </Button>
      </div>
    </form>
  );
}

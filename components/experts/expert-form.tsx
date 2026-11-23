"use client";

import { useNetworkScope } from "@/hooks/use-network-scope";
import { useSession } from "@/hooks/use-session";
import { NetworkSelect } from "@/components/ui/network-field";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { FormEvent, useMemo, useState } from "react";
import useSWR from "swr";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import StatusAlert from "@/components/ui/status-alert";
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
  const { data: session } = useSession();
  const { networkId, loading: networkLoading } = useNetworkScope(session);
  const { data: networks, isLoading: networksLoading } =
    useSWR<BaseInfoListResponse>("/base-info/networks");

  const [selectedNetworks, setNetworkIds] = useState<number[]>(expert?.networkIds ?? []);
  const networkIds = session?.isSystemAdmin ? selectedNetworks
    : expert?.networkIds ?? (networkId ? [Number(networkId)] : []);
  const [isActive, setIsActive] = useState(expert?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors,setFieldErrors]=useState<Record<string,string>>({});
  const [touched,setTouched]=useState<string[]>([]);
  const fieldLabels:Record<string,string>={firstName:"نام",lastName:"نام خانوادگی",specialty:"تخصص",workplace:"محل کار",mobilePhone:"موبایل",nationalCode:"کد ملی"};
  function validateField(name:string,value:string){
    if(!fieldLabels[name])return "";
    if(!value.trim())return `${fieldLabels[name]} الزامی است.`;
    if(name==="nationalCode" && !/^\d{10}$/.test(value.trim()))return "کد ملی باید ۱۰ رقم باشد.";
    if(name==="mobilePhone" && !/^\d{10,11}$/.test(value.trim()))return "شماره موبایل باید ۱۰ یا ۱۱ رقم باشد.";
    return "";
  }
  function validateInput(input:HTMLInputElement){if(!input.name)return;setFieldErrors(prev=>({...prev,[input.name]:validateField(input.name,input.value)}));}

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

    if (!session || networkLoading) return;

    if (networkIds.length === 0) {
      setError("حداقل یک شبکه برای کارشناس انتخاب کنید.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const invalid=Object.fromEntries(Object.keys(fieldLabels).map(key=>[key,validateField(key,String(form.get(key)??""))]));
    setFieldErrors(invalid);
    if(Object.values(invalid).some(Boolean))return;
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
    <form noValidate onSubmit={submit} className="space-y-6" onBlurCapture={event=>{const target=event.target as unknown as HTMLInputElement;if(target.name&&fieldLabels[target.name]){setTouched(prev=>prev.includes(target.name)?prev:[...prev,target.name]);validateInput(target);}}} onInputCapture={event=>{const target=event.target as unknown as HTMLInputElement;if(touched.includes(target.name))validateInput(target);}}>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="firstName" className="mb-2 text-default-600">نام *</Label>
          <Input id="firstName" name="firstName" aria-invalid={Boolean(fieldErrors.firstName)} data-valid={touched.includes("firstName") && !fieldErrors.firstName ? "true" : undefined} defaultValue={expert?.firstName} required />
          {fieldErrors.firstName ? <span role="alert" className="mt-1 block text-xs text-destructive">{fieldErrors.firstName}</span> : null}
        </div>
        <div>
          <Label htmlFor="lastName" className="mb-2 text-default-600">نام خانوادگی *</Label>
          <Input id="lastName" name="lastName" aria-invalid={Boolean(fieldErrors.lastName)} data-valid={touched.includes("lastName") && !fieldErrors.lastName ? "true" : undefined} defaultValue={expert?.lastName} required />
          {fieldErrors.lastName ? <span role="alert" className="mt-1 block text-xs text-destructive">{fieldErrors.lastName}</span> : null}
        </div>
        <div>
          <Label htmlFor="specialty" className="mb-2 text-default-600">تخصص *</Label>
          <Input id="specialty" name="specialty" aria-invalid={Boolean(fieldErrors.specialty)} data-valid={touched.includes("specialty") && !fieldErrors.specialty ? "true" : undefined} defaultValue={expert?.specialty} required />
          {fieldErrors.specialty ? <span role="alert" className="mt-1 block text-xs text-destructive">{fieldErrors.specialty}</span> : null}
        </div>
        <div>
          <Label htmlFor="education" className="mb-2 text-default-600">تحصیلات *</Label>
          <SearchableSelect
            id="education"
            name="education"
            defaultValue={expert?.education ?? EducationLevel.Bachelor}
            className="h-10 w-full rounded-md border border-default-300 bg-background px-3 text-sm text-default-700 focus:border-primary focus:outline-none"
          >
            {Object.entries(educationLevelLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </SearchableSelect>
        </div>
        <div>
          <Label htmlFor="workplace" className="mb-2 text-default-600">محل کار *</Label>
          <Input id="workplace" name="workplace" aria-invalid={Boolean(fieldErrors.workplace)} data-valid={touched.includes("workplace") && !fieldErrors.workplace ? "true" : undefined} defaultValue={expert?.workplace} required />
          {fieldErrors.workplace ? <span role="alert" className="mt-1 block text-xs text-destructive">{fieldErrors.workplace}</span> : null}
        </div>
        <div>
          <Label htmlFor="mobilePhone" className="mb-2 text-default-600">موبایل *</Label>
          <Input id="mobilePhone" name="mobilePhone" dir="ltr" aria-invalid={Boolean(fieldErrors.mobilePhone)} data-valid={touched.includes("mobilePhone") && !fieldErrors.mobilePhone ? "true" : undefined} defaultValue={expert?.mobilePhone} required />
          {fieldErrors.mobilePhone ? <span role="alert" className="mt-1 block text-xs text-destructive">{fieldErrors.mobilePhone}</span> : null}
        </div>
        <div>
          <Label htmlFor="nationalCode" className="mb-2 text-default-600">کد ملی *</Label>
          <Input id="nationalCode" name="nationalCode" dir="ltr" aria-invalid={Boolean(fieldErrors.nationalCode)} data-valid={touched.includes("nationalCode") && !fieldErrors.nationalCode ? "true" : undefined} defaultValue={expert?.nationalCode} required />
          {fieldErrors.nationalCode ? <span role="alert" className="mt-1 block text-xs text-destructive">{fieldErrors.nationalCode}</span> : null}
        </div>
        <div>
          <Label htmlFor="workPhone" className="mb-2 text-default-600">تلفن محل کار</Label>
          <Input id="workPhone" name="workPhone" dir="ltr" defaultValue={expert?.workPhone ?? ""} />
        </div>
      </div>

      {session?.isSystemAdmin ? <div>
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
      </div> : expert
        ? <div className="field">
          <span className="label">شبکه‌های کارشناس</span>
          <div className="input">{networkIds.map((id) => networkOptions.find((option) => option.id === id)?.label || `شبکه ${id}`).join("، ") || "شبکه‌ای تخصیص داده نشده است"}</div>
        </div>
        : <NetworkSelect session={session} value={networkId} loading={networkLoading} onChange={() => {}} />}

      {expert ? (
        <div className="flex items-center justify-between rounded-xl border bg-card p-4">
          <div>
            <div className="font-medium text-default-700">وضعیت کارشناس</div>
            <div className="mt-1 text-xs text-default-500">کارشناس غیرفعال در انتخاب‌های عملیاتی استفاده نمی‌شود.</div>
          </div>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>
      ) : null}

      {error ? (
        <StatusAlert
          type="error"
          title="اطلاعات فرم نیاز به اصلاح دارد"
          message={error}
          dismissible
          onDismiss={() => setError("")}
        />
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "در حال ثبت..." : expert ? "ذخیره تغییرات" : "ثبت کارشناس"}
        </Button>
      </div>
    </form>
  );
}

import { normalizePersianText, parsePositiveExternalId } from "./normalize";
import { baseInfoService } from "./service";

const PROVIDER_LABEL = normalizePersianText("تهیه‌کننده");

function configuredProviderJobId(): number | null {
  const raw = process.env.BASEINFO_PROVIDER_JOB_ID?.trim();
  if (!raw) return null;

  try {
    return parsePositiveExternalId(raw, "BASEINFO_PROVIDER_JOB_ID");
  } catch {
    throw new Error("BASEINFO_PROVIDER_JOB_ID must be a positive integer.");
  }
}

export async function resolveProviderJobId(): Promise<number> {
  const configured = configuredProviderJobId();
  if (configured) return configured;

  const response = await baseInfoService.getBusinessTypes();
  const exact = response.Data.find(
    (item) => normalizePersianText(item.Text) === PROVIDER_LABEL,
  );

  if (!exact) {
    throw new Error("Provider business type (تهیه‌کننده) was not found in Base Info.");
  }

  return parsePositiveExternalId(exact.Value, "providerJobId");
}

export async function loadProvidersForNetwork(networkId: number) {
  const validNetworkId = parsePositiveExternalId(networkId, "networkId");
  const jobId = await resolveProviderJobId();
  return baseInfoService.getProgramMakers(jobId, validNetworkId);
}

/** Resolve provider identities across all networks without conflating names with IDs. */
export async function loadAllProviders() {
  const jobId = await resolveProviderJobId();
  const networks = await baseInfoService.getNetworks();
  const networkIds = [...new Set(networks.Data.filter(item => !item.Disabled).map(item => parsePositiveExternalId(item.Value, "networkId")))];
  const all: Awaited<ReturnType<typeof baseInfoService.getProgramMakers>>["Data"] = [];
  // Keep requests bounded; a failed network must not silently produce an incomplete roster.
  for (let i = 0; i < networkIds.length; i += 4) {
    const batch = await Promise.all(networkIds.slice(i, i + 4).map(id => baseInfoService.getProgramMakers(jobId, id)));
    for (const result of batch) all.push(...result.Data);
  }
  const unique = new Map<string, typeof all[number]>();
  for (const person of all) {
    const id = parsePositiveExternalId(person.Value, "providerId");
    if (!unique.has(String(id))) unique.set(String(id), person);
  }
  return { IsSuccess: true, Message: null, Data: [...unique.values()].sort((a, b) => normalizePersianText(a.Text).localeCompare(normalizePersianText(b.Text), "fa")) };
}

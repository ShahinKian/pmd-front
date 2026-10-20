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

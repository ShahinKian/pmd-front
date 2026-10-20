export function getPmdApiBaseUrl(): string {
  const value = process.env.API_BASE_URL?.trim().replace(/\/+$/, "");
  if (!value) {
    throw new Error("API_BASE_URL is not configured.");
  }
  return value;
}

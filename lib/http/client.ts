import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";

type RetryConfig = InternalAxiosRequestConfig & { _pmdRetried?: boolean };

export const apiClient = axios.create({
  baseURL: "/api",
  timeout: 15_000,
  headers: { Accept: "application/json" },
});

let refreshPromise: Promise<void> | null = null;

async function refreshSession(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post("/api/auth/refresh", undefined, {
        timeout: 15_000,
        headers: { Accept: "application/json" },
      })
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined;
    const url = config?.url ?? "";
    const isRefreshable =
      !url.includes("/auth/login") &&
      !url.includes("/auth/refresh") &&
      !url.includes("/auth/logout");

    if (error.response?.status === 401 && config && !config._pmdRetried && isRefreshable) {
      config._pmdRetried = true;
      try {
        await refreshSession();
        return apiClient.request(config as AxiosRequestConfig);
      } catch {
        if (typeof window !== "undefined" && window.location.pathname !== "/login") {
          const returnTo = window.location.pathname + window.location.search;
          window.location.assign(`/login?returnTo=${encodeURIComponent(returnTo)}`);
        }
      }
    }

    return Promise.reject(error);
  },
);

export async function apiFetcher<T>(url: string): Promise<T> {
  const response = await apiClient.get<T>(url);
  return response.data;
}

export function apiErrorMessage(error: unknown, fallback = "خطایی رخ داد."): string {
  if (!axios.isAxiosError(error)) return fallback;

  const axiosError = error as AxiosError<unknown>;
  const body = axiosError.response?.data;

  if (body && typeof body === "object") {
    const data = body as Record<string, unknown>;
    if (typeof data.errors === "string" && data.errors.trim()) return data.errors;
    if (typeof data.message === "string" && data.message.trim()) return data.message;
    if (typeof data.title === "string" && data.title.trim()) return data.title;
  }

  if (axiosError.code === "ECONNABORTED") return "زمان پاسخ سرویس به پایان رسید.";
  return fallback;
}

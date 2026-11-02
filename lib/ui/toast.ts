export type ToastKind = "success" | "error" | "info";

export interface ToastPayload {
  type: ToastKind;
  message: string;
}

const EVENT_NAME = "pmd:toast";
const STORAGE_KEY = "pmd:flash-toast";

export function showToast(payload: ToastPayload, persist = false) {
  if (persist && typeof window !== "undefined") {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: payload }));
  }
}

export function consumeFlashToast(): ToastPayload | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(STORAGE_KEY);
  try { return JSON.parse(raw) as ToastPayload; } catch { return null; }
}

export const TOAST_EVENT_NAME = EVENT_NAME;

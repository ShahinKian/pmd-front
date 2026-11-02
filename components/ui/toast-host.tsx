"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Info } from "lucide-react";
import { consumeFlashToast, TOAST_EVENT_NAME, type ToastPayload } from "@/lib/ui/toast";

export function ToastHost() {
  const [toast, setToast] = useState<ToastPayload | null>(null);

  useEffect(() => {
    const flash = consumeFlashToast();
    if (flash) setToast(flash);

    const handler = (event: Event) => {
      setToast((event as CustomEvent<ToastPayload>).detail);
    };
    window.addEventListener(TOAST_EVENT_NAME, handler);
    return () => window.removeEventListener(TOAST_EVENT_NAME, handler);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;
  const success = toast.type === "success";
  const error = toast.type === "error";
  return (
    <div
      role="status"
      className={`fixed left-6 top-6 z-[9999] flex max-w-md items-center gap-3 rounded-xl border px-4 py-3 shadow-xl ${success ? "border-green-200 bg-green-50 text-green-800" : error ? "border-red-200 bg-red-50 text-red-800" : "border-sky-200 bg-sky-50 text-sky-800"}`}
    >
      {success ? <CheckCircle2 size={20}/> : error ? <XCircle size={20}/> : <Info size={20}/>}
      <span className="text-sm font-medium">{toast.message}</span>
    </div>
  );
}

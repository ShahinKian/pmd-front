"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { consumeFlashToast, TOAST_EVENT_NAME, type ToastPayload } from "@/lib/ui/toast";

export function ToastHost() {
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const [sequence, setSequence] = useState(0);

  useEffect(() => {
    const flash = consumeFlashToast();
    if (flash) setToast(flash);
    const handler = (event: Event) => {
      setToast((event as CustomEvent<ToastPayload>).detail);
      setSequence(value => value + 1);
    };
    window.addEventListener(TOAST_EVENT_NAME, handler);
    return () => window.removeEventListener(TOAST_EVENT_NAME, handler);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4800);
    return () => window.clearTimeout(timer);
  }, [toast, sequence]);

  if (!toast) return null;
  const Icon = toast.type === "success" ? CheckCircle2 : toast.type === "error" ? XCircle : Info;
  return (
    <div className="pointer-events-none fixed inset-x-3 top-4 z-[9999] flex justify-center sm:inset-x-auto sm:left-6 sm:top-6 sm:justify-end" dir="rtl">
      <div
        role={toast.type === "error" ? "alert" : "status"}
        aria-live={toast.type === "error" ? "assertive" : "polite"}
        className="pointer-events-auto flex w-full max-w-[min(24rem,calc(100vw-1.5rem))] items-start gap-3 rounded-2xl border border-border bg-card p-4 text-foreground shadow-[0_16px_45px_-18px_#24204480]"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{toast.type === "success" ? "عملیات موفق" : toast.type === "error" ? "خطا در عملیات" : "اطلاع‌رسانی"}</p>
          <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">{toast.message}</p>
        </div>
        <button type="button" aria-label="بستن اعلان" onClick={() => setToast(null)} className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

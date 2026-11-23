"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  busy?: boolean;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmDialog({
  open, title, description, confirmLabel = "تأیید", busy = false,
  destructive = false, onConfirm, onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) { event.preventDefault(); onCancel(); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, busy, onCancel]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-[#17182a]/55 p-4 print:hidden"
      onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
      <section role="alertdialog" aria-modal="true" aria-labelledby="pmd-dialog-title" aria-describedby="pmd-dialog-description"
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 text-foreground shadow-2xl" dir="rtl">
        <button type="button" aria-label="بستن پنجره" disabled={busy} onClick={onCancel}
          className="absolute left-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
          <X size={18} />
        </button>
        <span className="mb-4 grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <AlertTriangle size={22} />
        </span>
        <h2 id="pmd-dialog-title" className="text-lg font-extrabold">{title}</h2>
        <p id="pmd-dialog-description" className="mt-3 text-sm leading-7 text-muted-foreground">{description}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button ref={cancelRef} type="button" className="btn btn-outline" disabled={busy} onClick={onCancel}>انصراف</button>
          <button type="button" className={destructive ? "btn bg-destructive text-white hover:opacity-90" : "btn btn-primary"}
            disabled={busy} onClick={() => void onConfirm()}>
            {busy ? "در حال انجام..." : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

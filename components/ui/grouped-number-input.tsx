"use client";

import { useEffect, useLayoutEffect, useRef, useState, type InputHTMLAttributes } from "react";
import { asciiDigits, displayGroupedNumber, groupedCaret, ungroupNumber } from "@/lib/number-input";
import { cn } from "@/lib/utils";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "defaultValue" | "onChange" | "inputMode" | "min" | "max"> & {
  value?: string | number;
  defaultValue?: string | number;
  onValueChange?: (value: string) => void;
  decimalPlaces?: number;
  min?: number;
  max?: number;
};

export function GroupedNumberInput({
  value, defaultValue, onValueChange, decimalPlaces = 0, min, max, name, form, className,
  disabled, onKeyDown, onPaste, ...props
}: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(() => String(defaultValue ?? ""));
  const controlled = value !== undefined;
  const source = String(value ?? draft);
  const raw = ungroupNumber(source);
  const formatted = displayGroupedNumber(source);
  const numberPattern = decimalPlaces ? /^-?(?:\d+(?:\.\d+)?|\.\d+)$/ : /^-?\d+$/;
  const fractionLength = raw.split(".")[1]?.length ?? 0;
  const outOfRange = (min !== undefined && Number(raw) < min) || (max !== undefined && Number(raw) > max);
  const validation = raw && (!numberPattern.test(raw) || fractionLength > decimalPlaces)
    ? decimalPlaces ? `عدد را با حداکثر ${decimalPlaces} رقم اعشار وارد کنید.` : "عدد صحیح وارد کنید."
    : raw && outOfRange ? "عدد واردشده خارج از محدوده است." : "";

  useLayoutEffect(() => {
    input.current?.setCustomValidity(validation);
  }, [validation]);

  useEffect(() => {
    const owner = input.current?.form;
    function reset() {
      if (!controlled) setDraft(String(defaultValue ?? ""));
    }
    owner?.addEventListener("reset", reset);
    return () => owner?.removeEventListener("reset", reset);
  }, [controlled, defaultValue, form]);

  return <>
    <input {...props} ref={input} form={form} disabled={disabled} type="text" dir="ltr"
      className={cn("input tabular-nums", className)} inputMode={decimalPlaces ? "decimal" : "numeric"}
      value={formatted}
      onChange={(event) => {
        const field = event.currentTarget;
        const text = field.value;
        const left = ungroupNumber(text.slice(0, field.selectionStart ?? text.length)).length;
        const next = ungroupNumber(text);
        const display = displayGroupedNumber(next);
        if (text !== display) {
          field.value = display;
          const caret = groupedCaret(display, left);
          field.setSelectionRange(caret, caret);
        }
        if (!controlled) setDraft(next);
        onValueChange?.(next);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) return;
        const field = event.currentTarget;
        const caret = field.selectionStart;
        if (caret == null || caret !== field.selectionEnd) return;
        if (event.key === "Backspace" && field.value[caret - 1] === "٬") {
          field.setSelectionRange(caret - 1, caret - 1);
        } else if (event.key === "Delete" && field.value[caret] === "٬") {
          field.setSelectionRange(caret + 1, caret + 1);
        }
      }}
      onPaste={(event) => {
        onPaste?.(event);
        const text = asciiDigits(event.clipboardData.getData("text").trim());
        if (/[٬,]/.test(text) && !/^-?\d{1,3}(?:[٬,]\d{3})+(?:[٫.]\d+)?$/.test(text)) {
          event.preventDefault();
        }
      }} />
    {name && <input type="hidden" name={name} form={form} disabled={disabled} value={raw} />}
  </>;
}

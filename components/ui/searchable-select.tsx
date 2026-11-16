"use client";

import { Children, Fragment, isValidElement, useEffect, useRef, useState, type ComponentProps, type ReactNode, type SelectHTMLAttributes } from "react";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown } from "lucide-react";
import { normalizeSearch } from "@/lib/base-info/search";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string; disabled: boolean };

function optionText(children: ReactNode): string {
  return Children.toArray(children).map((child) =>
    typeof child === "string" || typeof child === "number" ? String(child) : "",
  ).join("").replace(/\s+/g, " ").trim();
}

function readOptions(children: ReactNode): Option[] {
  const options: Option[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement<ComponentProps<"option">>(child)) return;
    if (child.type === Fragment) {
      options.push(...readOptions(child.props.children));
    } else if (child.type === "option") {
      const text = optionText(child.props.children);
      options.push({ value: String(child.props.value ?? text), label: child.props.label ?? text, disabled: Boolean(child.props.disabled) });
    }
  });
  return options;
}

function normalizeOptionSearch(text: string): string {
  return normalizeSearch(text).replace(/[آأإٱ]/g, "ا");
}

export function SearchableSelect({
  children, className, disabled, id, style, value, defaultValue, onChange, onInvalid, required,
  "aria-label": ariaLabel, "aria-labelledby": labelledBy, "aria-describedby": describedBy, ...nativeProps
}: SelectHTMLAttributes<HTMLSelectElement>) {
  const native = useRef<HTMLSelectElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [choice, setChoice] = useState<string>();
  const [invalid, setInvalid] = useState(false);
  const [renderedOptions, setRenderedOptions] = useState<Option[]>();
  const options = renderedOptions ?? readOptions(children);
  const selected = String(value ?? choice ?? defaultValue ?? options.find((option) => !option.disabled)?.value ?? "");
  const search = normalizeOptionSearch(query);
  const filtered = options.filter((option) => !search || normalizeOptionSearch(option.label).includes(search));
  const current = options.find((option) => option.value === selected);

  useEffect(() => {
    const select = native.current;
    if (!select) return;
    const form = select.form;
    function readRenderedOptions() {
      if (!select) return;
      setRenderedOptions(Array.from(select.options, (option) => ({
        value: option.value,
        label: option.label.trim(),
        disabled: option.disabled || Boolean(option.closest("optgroup:disabled")),
      })));
    }
    function reset() { setChoice(undefined); setInvalid(false); }
    const observer = new MutationObserver(readRenderedOptions);
    observer.observe(select, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ["disabled", "label", "value"],
    });
    readRenderedOptions();
    form?.addEventListener("reset", reset);
    return () => { observer.disconnect(); form?.removeEventListener("reset", reset); };
  }, []);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => input.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  function changeOpen(next: boolean) {
    setQuery("");
    setOpen(next);
  }

  function choose(next: string) {
    const select = native.current;
    if (!select || select.value === next) return;
    select.value = next;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }

  return <>
    <Menu.Root open={open && !disabled} onOpenChange={changeOpen} modal={false} dir="rtl">
      <Menu.Trigger asChild>
        <button ref={trigger} id={id} type="button" disabled={disabled} style={style}
          className={cn("flex w-full min-w-0 items-center justify-between gap-2 text-start disabled:opacity-60", className)}
          aria-label={ariaLabel} aria-labelledby={labelledBy} aria-describedby={describedBy}
          aria-invalid={invalid || nativeProps["aria-invalid"]}>
          <span className="min-w-0 truncate">{current?.label || options.find((option) => option.value === "")?.label || "انتخاب کنید"}</span>
          <ChevronDown className="size-4 shrink-0" aria-hidden />
        </button>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content ref={menu} align="start" sideOffset={4}
          className="z-[1100] w-[var(--radix-dropdown-menu-trigger-width)] min-w-44 max-w-[calc(100vw-16px)] overflow-hidden rounded-lg border bg-popover p-1 text-sm text-popover-foreground shadow-md">
          <input ref={input} className="input mb-1" type="search" aria-label="جست‌وجو در گزینه‌ها"
            placeholder="جست‌وجو…" value={query} autoComplete="off" onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") return;
              event.stopPropagation();
              if (event.key === "Enter") {
                event.preventDefault();
                const first = filtered.find((option) => !option.disabled);
                if (first) { choose(first.value); changeOpen(false); trigger.current?.focus(); }
              } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                const items = menu.current?.querySelectorAll<HTMLElement>("[role=menuitemradio]:not([data-disabled])");
                if (items?.length) items[event.key === "ArrowDown" ? 0 : items.length - 1]?.focus();
              } else if (event.key === "Tab") {
                event.preventDefault();
                changeOpen(false);
                trigger.current?.focus();
              }
            }} />
          <Menu.RadioGroup value={selected} onValueChange={choose}
            className="max-h-[min(16rem,calc(var(--radix-dropdown-menu-content-available-height)-3.2rem))] overflow-y-auto">
            {filtered.map((option, index) => <Menu.RadioItem key={`${option.value}-${index}`} value={option.value} disabled={option.disabled}
              className="flex cursor-pointer items-center justify-between gap-2 rounded px-2 py-2 outline-none data-[disabled]:cursor-default data-[disabled]:opacity-50 data-[highlighted]:bg-accent">
              <span>{option.label}</span>
              <Menu.ItemIndicator><Check className="size-4" aria-hidden /></Menu.ItemIndicator>
            </Menu.RadioItem>)}
            {!filtered.length && <p className="p-2 text-default-500" role="status">گزینه‌ای پیدا نشد.</p>}
          </Menu.RadioGroup>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
    <select {...nativeProps} ref={native} className="sr-only" aria-hidden tabIndex={-1} value={value}
      defaultValue={defaultValue} disabled={disabled} required={required}
      onChange={(event) => {
        setChoice(event.currentTarget.value);
        setInvalid(false);
        onChange?.(event);
      }}
      onInvalid={(event) => {
        onInvalid?.(event);
        event.preventDefault();
        setInvalid(true);
        const select = event.currentTarget;
        const firstInvalid = select.form?.querySelector("input:invalid, select:invalid, textarea:invalid");
        if (firstInvalid && firstInvalid !== select) return;
        trigger.current?.focus();
        changeOpen(true);
      }}>
      {children}
    </select>
  </>;
}

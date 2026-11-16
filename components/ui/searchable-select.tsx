"use client";

import { Children, Fragment, isValidElement, useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode, type SelectHTMLAttributes } from "react";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { normalizeSearch } from "@/lib/base-info/search";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 40;
const displayPage = new Intl.NumberFormat("fa-IR").format;

type Option = { value: string; label: string; disabled: boolean };

function optionText(children: ReactNode): string {
  return Children.toArray(children).map((child) =>
    typeof child === "string" || typeof child === "number" ? String(child) : "",
  ).join("").replace(/\s+/g, " ").trim();
}

function readOptions(children: ReactNode) {
  const options: Option[] = [];
  let dynamic = false;
  function visit(nodes: ReactNode) {
    Children.forEach(nodes, (child) => {
      if (!isValidElement<ComponentProps<"option">>(child)) return;
      if (child.type === Fragment) {
        visit(child.props.children);
      } else if (child.type === "option") {
        const text = optionText(child.props.children);
        options.push({ value: String(child.props.value ?? text), label: child.props.label ?? text, disabled: Boolean(child.props.disabled) });
      } else {
        dynamic = true;
      }
    });
  }
  visit(children);
  return { options, dynamic };
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
  const list = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const [choice, setChoice] = useState<string>();
  const [invalid, setInvalid] = useState(false);
  const [renderedOptions, setRenderedOptions] = useState<Option[]>();
  const parsed = useMemo(() => readOptions(children), [children]);
  const options = parsed.dynamic && renderedOptions ? renderedOptions : parsed.options;
  const selected = String(value ?? choice ?? defaultValue ?? options.find((option) => !option.disabled)?.value ?? "");
  const search = normalizeOptionSearch(query);
  const searchIndex = useMemo(() => options.map((option) => normalizeOptionSearch(option.label)), [options]);
  const matches = useMemo(() => search ? options.filter((_, index) => searchIndex[index].includes(search)) : options,
    [options, searchIndex, search]);
  const pageCount = Math.ceil(matches.length / PAGE_SIZE);
  const activePage = Math.min(page, Math.max(0, pageCount - 1));
  const visible = open ? matches.slice(activePage * PAGE_SIZE, (activePage + 1) * PAGE_SIZE) : [];
  const current = options.find((option) => option.value === selected);

  useEffect(() => {
    const select = native.current;
    if (!select) return;
    const form = select.form;
    function reset() { setChoice(undefined); setInvalid(false); }
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, []);

  useEffect(() => {
    const select = native.current;
    if (!parsed.dynamic || !select) return;
    const readRenderedOptions = () => setRenderedOptions(Array.from(select.options, (option) => ({
      value: option.value,
      label: option.label.trim(),
      disabled: option.disabled || Boolean(option.closest("optgroup:disabled")),
    })));
    const observer = new MutationObserver(readRenderedOptions);
    observer.observe(select, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ["disabled", "label", "value"],
    });
    readRenderedOptions();
    return () => observer.disconnect();
  }, [parsed.dynamic]);

  useEffect(() => {
    if (list.current) list.current.scrollTop = 0;
  }, [activePage, search]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => input.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  function changeOpen(next: boolean) {
    setQuery("");
    setPage(0);
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
          <div className="relative mb-1.5">
            <Search className="pointer-events-none absolute start-3 top-3 size-4 text-default-500" aria-hidden />
            <input ref={input} className="input !ps-9" type="search" aria-label="جست‌وجو در گزینه‌ها"
            placeholder="جست‌وجو…" value={query} autoComplete="off" onChange={(event) => { setQuery(event.target.value); setPage(0); }}
            onKeyDown={(event) => {
              if (event.key === "Escape") return;
              event.stopPropagation();
              if (event.key === "Enter") {
                event.preventDefault();
                const first = visible.find((option) => !option.disabled);
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
          </div>
          <Menu.RadioGroup ref={list} value={selected} onValueChange={choose}
            className="max-h-[min(16rem,calc(var(--radix-dropdown-menu-content-available-height)-5.5rem))] overflow-y-auto">
            {visible.map((option, index) => <Menu.RadioItem key={`${option.value}-${index}`} value={option.value} disabled={option.disabled}
              className="flex cursor-pointer items-center justify-between gap-2 rounded px-2 py-2 outline-none data-[disabled]:cursor-default data-[disabled]:opacity-50 data-[highlighted]:bg-accent">
              <span>{option.label}</span>
              <Menu.ItemIndicator><Check className="size-4" aria-hidden /></Menu.ItemIndicator>
            </Menu.RadioItem>)}
            {!matches.length && <p className="p-2 text-default-500" role="status">گزینه‌ای پیدا نشد.</p>}
          </Menu.RadioGroup>
          {pageCount > 1 && <div className="flex items-center justify-between gap-1 border-t px-1 pt-1 text-xs">
            <Menu.Item disabled={activePage === 0} className="flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1.5 outline-none data-[disabled]:opacity-40 data-[highlighted]:bg-accent" onSelect={(event) => {
              event.preventDefault(); setPage(activePage - 1); input.current?.focus();
            }}><ChevronRight className="size-4" aria-hidden />قبلی</Menu.Item>
            <span className="tabular-nums text-default-600" aria-live="polite">
              {displayPage(activePage + 1)} از {displayPage(pageCount)}
            </span>
            <Menu.Item disabled={activePage + 1 === pageCount} className="flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1.5 outline-none data-[disabled]:opacity-40 data-[highlighted]:bg-accent" onSelect={(event) => {
              event.preventDefault(); setPage(activePage + 1); input.current?.focus();
            }}>بعدی<ChevronLeft className="size-4" aria-hidden /></Menu.Item>
          </div>}
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

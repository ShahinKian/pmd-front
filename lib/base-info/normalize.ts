import type { BaseInfoItem, SelectOption } from "./types";

const ARABIC_DIACRITICS = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;

export function normalizePersianText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(ARABIC_DIACRITICS, "")
    .replace(/[\u200C\u200D]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parsePositiveExternalId(value: unknown, fieldName = "id"): number {
  const normalized =
    typeof value === "string" && value.trim() !== "" ? Number(value.trim()) : value;

  if (typeof normalized !== "number" || !Number.isInteger(normalized) || normalized <= 0) {
    throw new TypeError(`${fieldName} must be a positive integer`);
  }

  return normalized;
}

export function toNumericOption(item: BaseInfoItem): SelectOption<number> {
  return {
    value: parsePositiveExternalId(item.Value, "Value"),
    label: item.Text,
    disabled: item.Disabled || undefined,
  };
}

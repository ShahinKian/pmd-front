import type { Money } from "./types.ts";

export const paymentMonths = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

const number = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 });
const date = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "medium", timeZone: "UTC" });

export const displayNumber = (value: number | Money) => number.format(value);
export const displayDate = (value: string) => date.format(new Date(value + "T00:00:00Z"));

export function parseDeduction(value: string): Money | null {
  const ascii = value.trim()
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632))
    .replace("٫", ".");
  if (!/^(?:\d+|\d{1,3}(?:[٬,]\d{3})+)(?:\.\d{1,2})?$/.test(ascii)) return null;
  const [integer, fractional] = ascii.replace(/[٬,]/g, "").split(".");
  const whole = integer.replace(/^0+(?=\d)/, "");
  if (whole.length > 16) return null;
  return (fractional ? `${whole}.${fractional}` : whole) as Money;
}

export function amountExceeds(amount: Money, limit: Money): boolean {
  function cents(value: Money) {
    const [whole, fractional = ""] = value.split(".");
    return BigInt(whole + fractional.padEnd(2, "0"));
  }
  return cents(amount) > cents(limit);
}

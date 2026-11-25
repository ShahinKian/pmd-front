import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import gregorian from "react-date-object/calendars/gregorian";
import { asciiDigits } from "@/lib/number-input";

const tehranDay = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tehran" });
export const currentTehranDate = () => tehranDay.format(new Date());

function calendarDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:[T ].*)?$/.exec(asciiDigits(value.trim()));
  if (!match) return null;
  const [, year, month, day] = match;
  const key = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  if (Number(year) >= 1300 && Number(year) < 1500) {
    const date = new DateObject({ calendar: persian, date: key, format: "YYYY-MM-DD" });
    return date.isValid && date.format("YYYY-MM-DD") === key
      ? date.convert(gregorian).format("YYYY-MM-DD") : null;
  }

  const date = new Date(`${key}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== key ? null : key;
}

export function readPlanPeriod(data: unknown, planId: number) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const fields = Object.fromEntries(Object.entries(data).map(([key, value]) => [key.toLowerCase(), value]));
  if (fields.planid != null && Number(fields.planid) !== planId) return null;

  for (const [start, end] of [
    ["broadcaststartdate", "broadcastenddate"],
    ["startbroadcastdate", "endbroadcastdate"],
    ["planstartdate", "planenddate"],
    ["startdate", "enddate"],
    ["fromdate", "todate"],
  ]) {
    const startDate = calendarDate(fields[start]);
    const endDate = calendarDate(fields[end]);
    if (startDate && endDate && startDate <= endDate) return { startDate, endDate };
  }
  return null;
}

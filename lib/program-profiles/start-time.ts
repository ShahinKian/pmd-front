import { asciiDigits } from "@/lib/number-input";

export function normalizeStartTime(value: string): string | null {
  const match = /^(\d{1,2}):(\d{1,2})(?::([0-5]\d))?$/.exec(asciiDigits(value.trim()));
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return null;
  return `${match[1].padStart(2, "0")}:${match[2].padStart(2, "0")}`;
}

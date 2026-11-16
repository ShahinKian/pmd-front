export function asciiDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const code = digit.charCodeAt(0);
    return String(code - (code >= 1776 ? 1776 : 1632));
  });
}

export function ungroupNumber(value: string): string {
  return asciiDigits(value.trim()).replace(/[٬,]/g, "").replaceAll("٫", ".");
}

export function displayGroupedNumber(value: string): string {
  const raw = ungroupNumber(value);
  if (!/^-?\d*(?:\.\d*)?$/.test(raw)) return value;
  const [whole, fraction] = raw.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, "٬");
  return (fraction === undefined ? grouped : grouped + "٫" + fraction)
    .replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}

export function groupedCaret(value: string, offset: number): number {
  let index = 0;
  while (offset > 0 && index < value.length) {
    if (value[index] !== "٬") offset--;
    index++;
  }
  return index;
}

export function normalizeSearch(value: string): string {
  return value.normalize("NFKC").replace(/ي/g, "ی").replace(/ك/g, "ک")
    .replace(/[\u064B-\u065F\u0670]/g, "").replace(/[\s\u200c]+/g, " ").trim().toLocaleLowerCase("fa");
}

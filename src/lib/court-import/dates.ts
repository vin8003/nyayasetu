const MONTHS: Record<string, string> = {
  jan: "01",
  january: "01",
  feb: "02",
  february: "02",
  mar: "03",
  march: "03",
  apr: "04",
  april: "04",
  may: "05",
  jun: "06",
  june: "06",
  jul: "07",
  july: "07",
  aug: "08",
  august: "08",
  sep: "09",
  sept: "09",
  september: "09",
  oct: "10",
  october: "10",
  nov: "11",
  november: "11",
  dec: "12",
  december: "12",
};

export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function parseIndianDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = raw.replace(/\u00a0/g, " ").trim();
  if (!t) return null;
  if (isIsoDate(t)) return t;
  const dmy = t.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dmy) {
    const dd = dmy[1].padStart(2, "0");
    const mm = dmy[2].padStart(2, "0");
    if (Number(mm) < 1 || Number(mm) > 12 || Number(dd) < 1 || Number(dd) > 31) return null;
    return `${dmy[3]}-${mm}-${dd}`;
  }
  const named = t.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+),?\s+(\d{4})$/);
  if (named) {
    const mm = MONTHS[named[2].toLowerCase()];
    if (!mm) return null;
    return `${named[3]}-${mm}-${named[1].padStart(2, "0")}`;
  }
  return null;
}

export function firstDateIn(text: string): string | null {
  const iso = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];
  const dmy = text.match(/\b(\d{1,2}[./-]\d{1,2}[./-]\d{4})\b/);
  if (dmy) return parseIndianDate(dmy[1]);
  const named = text.match(/\b(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+,?\s+\d{4})\b/);
  if (named) return parseIndianDate(named[1]);
  return null;
}

export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function addRelativeDeadline(from: string, text: string): string | null {
  if (!isIsoDate(from)) return null;
  const days = text.match(/\bwithin\s+(\d+)\s+days?\b/i);
  if (days) return addDaysISO(from, Number(days[1]));
  const weeks = text.match(/\bwithin\s+(\d+)\s+weeks?\b/i);
  if (weeks) return addDaysISO(from, Number(weeks[1]) * 7);
  const months = text.match(/\bwithin\s+(\d+)\s+months?\b/i);
  if (months) return addDaysISO(from, Number(months[1]) * 30);
  const four = text.match(/\bwithin\s+(a|one|1)\s+month\b/i);
  if (four) return addDaysISO(from, 30);
  return null;
}

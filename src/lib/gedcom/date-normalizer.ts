const MONTHS: Record<string, string> = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04',
  MAY: '05', JUN: '06', JUL: '07', AUG: '08',
  SEP: '09', OCT: '10', NOV: '11', DEC: '12',
};

const DATE_PREFIXES = ['ABT', 'BEF', 'AFT', 'EST', 'CAL', 'INT'];

/**
 * Strictly parses a complete "DD MON YYYY" date (no prefix, no range) and
 * validates it is a real calendar date (rejects e.g. "31 FEB 1900").
 * Shared by normalizeDate() and duplicate-analysis.ts's eligibility check,
 * which both need the same complete/valid-date semantics.
 */
export function parseStrictFullDate(raw: string): { year: number; month: number; day: number; iso: string } | null {
  const m = raw.trim().toUpperCase().match(/^(\d{1,2})\s+([A-Z]{3})\s+(\d{4})$/);
  if (!m) return null;
  const monthStr = MONTHS[m[2]];
  if (!monthStr) return null;
  const monthIdx = Number(monthStr) - 1;
  const day = Number(m[1]);
  const year = Number(m[3]);
  const date = new Date(0);
  date.setUTCFullYear(year, monthIdx, day);
  if (date.getUTCMonth() !== monthIdx || date.getUTCDate() !== day) return null;
  return { year, month: monthIdx + 1, day, iso: `${year}-${monthStr}-${String(day).padStart(2, '0')}` };
}

export function normalizeDate(rawDate: string | undefined): string | undefined {
  if (!rawDate) return undefined;

  let cleaned = rawDate.trim();

  // Handle "FROM date1 TO date2" and "BET date1 AND date2" — take the first date
  if (cleaned.startsWith('FROM ')) {
    cleaned = cleaned.replace(/^FROM\s+/, '').split(/\s+TO\s+/)[0].trim();
  } else if (cleaned.startsWith('BET ')) {
    cleaned = cleaned.replace(/^BET\s+/, '').split(/\s+AND\s+/)[0].trim();
  }

  // Remove simple qualifiers
  for (const prefix of DATE_PREFIXES) {
    if (cleaned.startsWith(prefix + ' ')) {
      cleaned = cleaned.substring(prefix.length + 1).trim();
    }
  }

  // Full date: "10 JUN 1952"
  const fullDate = parseStrictFullDate(cleaned);
  if (fullDate) return fullDate.iso;

  // Month+Year: "JUN 1978"
  const monthYearMatch = cleaned.match(/^([A-Z]{3})\s+(\d{4})$/);
  if (monthYearMatch) {
    const [, month, year] = monthYearMatch;
    return `${year}-${MONTHS[month]}`;
  }

  // Year only: "1850"
  const yearMatch = cleaned.match(/^(\d{4})$/);
  if (yearMatch) {
    return yearMatch[1];
  }

  return undefined;
}

export function extractYear(rawDate: string | undefined): string | undefined {
  if (!rawDate) return undefined;
  const match = rawDate.match(/(\d{4})/);
  return match ? match[1] : undefined;
}

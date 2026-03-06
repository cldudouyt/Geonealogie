const MONTHS: Record<string, string> = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04',
  MAY: '05', JUN: '06', JUL: '07', AUG: '08',
  SEP: '09', OCT: '10', NOV: '11', DEC: '12',
};

const DATE_PREFIXES = ['ABT', 'BEF', 'AFT', 'EST', 'CAL', 'FROM', 'TO', 'BET', 'AND', 'INT'];

export function normalizeDate(rawDate: string | undefined): string | undefined {
  if (!rawDate) return undefined;

  let cleaned = rawDate.trim();

  // Remove prefixes like ABT, BEF, AFT, etc.
  for (const prefix of DATE_PREFIXES) {
    if (cleaned.startsWith(prefix + ' ')) {
      cleaned = cleaned.substring(prefix.length + 1).trim();
    }
  }

  // Handle "BET date1 AND date2" - take date1
  if (cleaned.includes(' AND ')) {
    cleaned = cleaned.split(' AND ')[0].trim();
  }

  // Full date: "10 JUN 1952"
  const fullMatch = cleaned.match(/^(\d{1,2})\s+([A-Z]{3})\s+(\d{4})$/);
  if (fullMatch) {
    const [, day, month, year] = fullMatch;
    return `${year}-${MONTHS[month]}-${day.padStart(2, '0')}`;
  }

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

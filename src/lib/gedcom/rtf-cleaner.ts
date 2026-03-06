const RTF_ESCAPE_MAP: Record<string, string> = {
  "\\'e0": 'à', "\\'e1": 'á', "\\'e2": 'â', "\\'e3": 'ã', "\\'e4": 'ä',
  "\\'e8": 'è', "\\'e9": 'é', "\\'ea": 'ê', "\\'eb": 'ë',
  "\\'ec": 'ì', "\\'ed": 'í', "\\'ee": 'î', "\\'ef": 'ï',
  "\\'f0": 'ð', "\\'f1": 'ñ', "\\'f2": 'ò', "\\'f3": 'ó', "\\'f4": 'ô',
  "\\'f6": 'ö', "\\'f9": 'ù', "\\'fa": 'ú', "\\'fb": 'û', "\\'fc": 'ü',
  "\\'e7": 'ç', "\\'c0": 'À', "\\'c9": 'É', "\\'c8": 'È',
  "\\'92": "'", "\\'93": '"', "\\'94": '"', "\\'95": '•',
  "\\'96": '–', "\\'97": '—', "\\'a0": ' ', "\\'ab": '«', "\\'bb": '»',
  "\\'b0": '°', "\\'f7": '÷', "\\'d7": '×',
};

export function cleanRtf(text: string): string {
  if (!text) return '';

  // Not RTF
  if (!text.includes('{\\rtf')) return text;

  let result = text;

  // Remove font tables, color tables, etc.
  result = result.replace(/\{\\fonttbl[^}]*\}/g, '');
  result = result.replace(/\{\\colortbl[^}]*\}/g, '');
  result = result.replace(/\{\\\*\\expandedcolortbl[^}]*\}/g, '');

  // Remove RTF header (use [^\n}]* to avoid consuming the whole document across newlines)
  result = result.replace(/^\{\\rtf1\\ansi[^\n}]*\n?/m, '');

  // Remove \pard and paragraph formatting
  result = result.replace(/\\pard[^\n]*/g, '');

  // Remove RTF line-break markers (backslash at end of line)
  result = result.replace(/\\\n/g, '\n');

  // Replace RTF escapes with actual characters
  for (const [escape, char] of Object.entries(RTF_ESCAPE_MAP)) {
    result = result.replaceAll(escape, char);
  }

  // Remove remaining RTF control words (e.g., \f0, \fs24, \cf0)
  result = result.replace(/\\[a-z]+\d*\s?/g, '');

  // Remove remaining braces
  result = result.replace(/[{}]/g, '');

  // Clean up whitespace
  result = result.replace(/\n{3,}/g, '\n\n');
  result = result.trim();

  return result;
}

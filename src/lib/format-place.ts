const UNKNOWN_TOKENS = new Set(['', '?', '-', '.', '...', 'x', 'inconnu', 'inconnue', 'lieu inconnu', 'n/a', 'na']);

function titleCaseIfShouty(label: string): string {
  if (label !== label.toUpperCase()) return label;
  return label
    .toLowerCase()
    .replace(/(^|[\s\-'’])(\p{L})/gu, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

/**
 * Normalizes a raw place string for display on the map (pins, popups, sidebar).
 * Keeps only the first comma segment, strips postal codes / stray digits and
 * punctuation, and title-cases ALL-CAPS names.
 * Returns '' when the place is unknown/unusable (e.g. "?", digits only).
 * e.g. "Cerences,50510,Manche,…" → "Cerences" ; "SAINT-LO" → "Saint-Lo" ; "?" → ""
 */
export function formatPlaceLabel(raw: string | undefined | null): string {
  if (!raw) return '';
  let label = (raw.split(',')[0] ?? '').trim();
  label = label
    .replace(/\d+\s*(?:er|ère|ere|ème|eme|è|e)?\b/gi, ' ') // codes postaux, arrondissements (13, 3ème…)
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s\-–—.,;:?!]+|[\s\-–—.,;:?!]+$/gu, '')
    .trim();
  if (UNKNOWN_TOKENS.has(label.toLowerCase())) return '';
  if (label.replace(/[^\p{L}]/gu, '').length < 2) return '';
  label = titleCaseIfShouty(label);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

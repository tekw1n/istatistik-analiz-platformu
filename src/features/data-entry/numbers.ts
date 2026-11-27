export type DecimalMark = ',' | '.';

const PATTERNS: Record<DecimalMark, RegExp> = {
  '.': /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/,
  // Dots are accepted only as thousands separators in groups of three.
  ',': /^[+-]?((\d{1,3}(\.\d{3})+|\d+)(,\d*)?|,\d+)([eE][+-]?\d+)?$/,
};

/** Returns null when the text is not a finite number written with the given decimal mark. */
export function parseNumber(text: string, decimal: DecimalMark): number | null {
  const clean = text.trim().replace(/−/g, '-');
  if (!PATTERNS[decimal].test(clean)) return null;
  const value = Number(
    decimal === ',' ? clean.replace(/\./g, '').replace(',', '.') : clean,
  );
  return Number.isFinite(value) ? value : null;
}

/** A single table cell: a comma means the Turkish notation, otherwise the dot is the decimal mark. */
export function parseCell(text: string): number | null {
  return parseNumber(text, text.includes(',') ? ',' : '.');
}

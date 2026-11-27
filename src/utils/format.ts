const SUPERSCRIPTS: Record<string, string> = {
  '-': '⁻',
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
};

/** Mantissa and exponent for numbers that fixed notation would show as 0 or as a long digit run. */
function scientificParts(value: number, digits: number): [string, number] | null {
  const size = Math.abs(value);
  if (value === 0 || !Number.isFinite(value) || (size >= 10 ** -4 && size < 1e15)) return null;
  const [mantissa, exponent] = value.toExponential(Math.min(digits, 4)).split('e');
  return [String(Number(mantissa)).replace('.', ','), Number(exponent)];
}

function fixed(value: number, digits: number): string {
  // Adding 0 turns -0 into 0.
  return (value + 0).toLocaleString('tr-TR', { maximumFractionDigits: digits });
}

/**
 * Turkish number notation with at most `digits` decimals; infinite bounds as ∞.
 * Very small and very large magnitudes are written as 1,23 × 10⁻⁷.
 */
export function formatNumber(value: number, digits = 6): string {
  if (value === Infinity) return '∞';
  if (value === -Infinity) return '−∞';
  const parts = scientificParts(value, digits);
  if (!parts) return fixed(value, digits);
  const exponent = [...String(parts[1])].map((c) => SUPERSCRIPTS[c]).join('');
  return `${parts[0]} × 10${exponent}`;
}

/** The same notation as a LaTeX fragment. */
export function texNumber(value: number, digits = 6): string {
  if (value === Infinity) return '\\infty';
  if (value === -Infinity) return '-\\infty';
  const parts = scientificParts(value, digits);
  // Braces stop TeX from adding a space after the decimal comma.
  const braces = (text: string) => text.replace(/,/g, '{,}');
  if (parts) return `${braces(parts[0])}\\times 10^{${parts[1]}}`;
  // Thousands separators are dots in Turkish; braces keep them tight as well.
  return braces(fixed(value, digits)).replace(/\./g, '{.}');
}

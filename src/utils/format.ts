/** Turkish number notation with at most `digits` decimals; infinite bounds as ∞. */
export function formatNumber(value: number, digits = 6): string {
  if (value === Infinity) return '∞';
  if (value === -Infinity) return '−∞';
  return value.toLocaleString('tr-TR', { maximumFractionDigits: digits });
}

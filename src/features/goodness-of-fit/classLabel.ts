import type { ChiSquareClass } from '../../chiSquare/types';
import type { Distribution } from '../../distributions/distributionTypes';
import { formatNumber } from '../../utils/format';

/** Readable range of a test class. */
export function classLabel(kind: Distribution['kind'], { lower, upper }: ChiSquareClass): string {
  const a = formatNumber(lower);
  const b = formatNumber(upper);
  if (lower === -Infinity && upper === Infinity) return 'Tüm değerler';
  if (kind === 'discrete') {
    if (lower === upper) return `X = ${a}`;
    return upper === Infinity ? `X ≥ ${a}` : `${a} ≤ X ≤ ${b}`;
  }
  if (lower === -Infinity) return `X < ${b}`;
  return upper === Infinity ? `X ≥ ${a}` : `${a} ≤ X < ${b}`;
}

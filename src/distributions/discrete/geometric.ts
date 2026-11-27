import { discreteDistribution, requireParameter } from '../createDistribution';
import type { DiscreteDistribution } from '../distributionTypes';

/**
 * 'trials': number of trials up to the first success, X = 1, 2, 3, ...
 * 'failures': number of failures before the first success, X = 0, 1, 2, ...
 */
export type GeometricDefinition = 'trials' | 'failures';

export function geometric(
  p: number,
  definition: GeometricDefinition = 'trials',
): DiscreteDistribution {
  requireParameter(p > 0 && p <= 1, 'Geometrik: p, 0 < p ≤ 1 aralığında olmalıdır.');
  const first = definition === 'trials' ? 1 : 0;
  const logQ = Math.log1p(-p);
  // ln P(X > k) = (number of failures) · ln(1 - p)
  const logSf = (k: number) => (k - first + 1) * logQ;
  return discreteDistribution({
    support: { min: first, max: Infinity, integer: true },
    // The guard avoids 0 · ln(0) when p = 1.
    density: (k) => (k === first ? p : p * Math.exp((k - first) * logQ)),
    cdf: (k) => -Math.expm1(logSf(k)),
    sf: (k) => Math.exp(logSf(k)),
  });
}

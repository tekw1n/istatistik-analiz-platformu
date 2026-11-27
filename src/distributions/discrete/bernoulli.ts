import { discreteDistribution, requireParameter } from '../createDistribution';
import type { DiscreteDistribution } from '../distributionTypes';

/** A single trial: 1 (success) with probability p, otherwise 0. */
export function bernoulli(p: number): DiscreteDistribution {
  requireParameter(p >= 0 && p <= 1, 'Bernoulli: p, 0 ile 1 arasında olmalıdır.');
  return discreteDistribution({
    support: { min: 0, max: 1, integer: true },
    density: (k) => (k === 1 ? p : 1 - p),
    cdf: () => 1 - p,
    sf: () => p,
  });
}

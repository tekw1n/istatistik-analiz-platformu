import { continuousDistribution, requireParameter } from '../createDistribution';
import type { ContinuousDistribution } from '../distributionTypes';

/** Exponential distribution with rate lambda; the mean (scale) is 1 / lambda. */
export function exponential(lambda: number): ContinuousDistribution {
  requireParameter(
    lambda > 0 && Number.isFinite(lambda),
    'Üstel: λ (hız) pozitif ve sonlu olmalıdır.',
  );
  return continuousDistribution({
    support: { min: 0, max: Infinity, integer: false },
    density: (x) => lambda * Math.exp(-lambda * x),
    cdf: (x) => -Math.expm1(-lambda * x),
    sf: (x) => Math.exp(-lambda * x),
  });
}

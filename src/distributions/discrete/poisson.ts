import { logGamma, regularizedGammaP, regularizedGammaQ } from '../../math/gamma';
import { discreteDistribution, requireParameter } from '../createDistribution';
import type { DiscreteDistribution } from '../distributionTypes';

/** Poisson distribution with mean lambda. */
export function poisson(lambda: number): DiscreteDistribution {
  requireParameter(
    lambda > 0 && Number.isFinite(lambda),
    'Poisson: λ pozitif ve sonlu olmalıdır.',
  );
  return discreteDistribution({
    support: { min: 0, max: Infinity, integer: true },
    density: (k) => Math.exp(k * Math.log(lambda) - lambda - logGamma(k + 1)),
    // P(X <= k) = Q(k + 1, λ)
    cdf: (k) => regularizedGammaQ(k + 1, lambda),
    sf: (k) => regularizedGammaP(k + 1, lambda),
  });
}

import { normalCdf, normalSf } from '../../math/normal';
import { continuousDistribution, requireParameter } from '../createDistribution';
import type { ContinuousDistribution } from '../distributionTypes';

/** Normal distribution with mean mu and standard deviation sigma (not the variance). */
export function normal(mu: number, sigma: number): ContinuousDistribution {
  requireParameter(Number.isFinite(mu), 'Normal: μ sonlu bir sayı olmalıdır.');
  requireParameter(
    sigma > 0 && Number.isFinite(sigma),
    'Normal: σ pozitif ve sonlu olmalıdır.',
  );
  return continuousDistribution({
    support: { min: -Infinity, max: Infinity, integer: false },
    density: (x) => {
      const z = (x - mu) / sigma;
      return Math.exp((-z * z) / 2) / (sigma * Math.sqrt(2 * Math.PI));
    },
    cdf: (x) => normalCdf(x, mu, sigma),
    sf: (x) => normalSf(x, mu, sigma),
  });
}

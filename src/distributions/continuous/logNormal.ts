import { normalCdf, normalSf } from '../../math/normal';
import { continuousDistribution, requireParameter } from '../createDistribution';
import type { ContinuousDistribution } from '../distributionTypes';

/** X is log-normal when ln(X) is normal with mean mu and standard deviation sigma. */
export function logNormal(mu: number, sigma: number): ContinuousDistribution {
  requireParameter(Number.isFinite(mu), 'Log-Normal: μ sonlu bir sayı olmalıdır.');
  requireParameter(
    sigma > 0 && Number.isFinite(sigma),
    'Log-Normal: σ pozitif ve sonlu olmalıdır.',
  );
  return continuousDistribution({
    support: { min: 0, max: Infinity, integer: false, minExclusive: true },
    density: (x) => {
      const z = (Math.log(x) - mu) / sigma;
      return Math.exp((-z * z) / 2) / (x * sigma * Math.sqrt(2 * Math.PI));
    },
    // x = 0 gives ln(x) = -Infinity, which the normal tails map to 0 and 1.
    cdf: (x) => normalCdf(Math.log(x), mu, sigma),
    sf: (x) => normalSf(Math.log(x), mu, sigma),
  });
}

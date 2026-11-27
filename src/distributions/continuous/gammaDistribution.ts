import { logGamma, regularizedGammaP, regularizedGammaQ } from '../../math/gamma';
import { continuousDistribution, requireParameter } from '../createDistribution';
import type { ContinuousDistribution } from '../distributionTypes';

/** Gamma distribution with shape alpha and scale theta; the mean is alpha · theta. */
export function gammaDistribution(alpha: number, theta: number): ContinuousDistribution {
  requireParameter(
    alpha > 0 && Number.isFinite(alpha),
    'Gamma: α (şekil) pozitif ve sonlu olmalıdır.',
  );
  requireParameter(
    theta > 0 && Number.isFinite(theta),
    'Gamma: θ (ölçek) pozitif ve sonlu olmalıdır.',
  );
  const logNormalizer = logGamma(alpha) + alpha * Math.log(theta);
  return continuousDistribution({
    support: { min: 0, max: Infinity, integer: false, minExclusive: true },
    density: (x) => Math.exp((alpha - 1) * Math.log(x) - x / theta - logNormalizer),
    cdf: (x) => regularizedGammaP(alpha, x / theta),
    sf: (x) => regularizedGammaQ(alpha, x / theta),
  });
}

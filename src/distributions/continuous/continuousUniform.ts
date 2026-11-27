import { continuousDistribution, requireParameter } from '../createDistribution';
import type { ContinuousDistribution } from '../distributionTypes';

/** Uniform density on [a, b]. */
export function continuousUniform(a: number, b: number): ContinuousDistribution {
  requireParameter(
    Number.isFinite(a) && Number.isFinite(b) && a < b,
    'Sürekli Düzgün: a ve b sonlu olmalı ve a < b sağlanmalıdır.',
  );
  const width = b - a;
  return continuousDistribution({
    support: { min: a, max: b, integer: false },
    density: () => 1 / width,
    cdf: (x) => (x - a) / width,
    sf: (x) => (b - x) / width,
  });
}

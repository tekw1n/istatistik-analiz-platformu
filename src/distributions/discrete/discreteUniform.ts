import { discreteDistribution, requireParameter } from '../createDistribution';
import type { DiscreteDistribution } from '../distributionTypes';

/** Every integer from a to b (both included) is equally likely. */
export function discreteUniform(a: number, b: number): DiscreteDistribution {
  requireParameter(
    Number.isSafeInteger(a) && Number.isSafeInteger(b) && a <= b,
    'Kesikli Düzgün: a ve b tam sayı olmalı ve a ≤ b sağlanmalıdır.',
  );
  const count = b - a + 1;
  return discreteDistribution({
    support: { min: a, max: b, integer: true },
    density: () => 1 / count,
    cdf: (k) => (k - a + 1) / count,
    sf: (k) => (b - k) / count,
  });
}

import { logGamma } from '../../math/gamma';
import { discreteDistribution, requireParameter } from '../createDistribution';
import type { DiscreteDistribution } from '../distributionTypes';
import { formatNumber } from '../../utils/format';

// shortcut: the tails are summed term by term, O(n) in the worst case;
// use the regularized incomplete beta function if n above 1e6 is ever needed.
const MAX_TRIALS = 1_000_000;

/** k · ln(p), with 0 · ln(0) = 0 */
const times = (k: number, logP: number) => (k === 0 ? 0 : k * logP);

/** Number of successes in n independent trials with success probability p. */
export function binomial(n: number, p: number): DiscreteDistribution {
  requireParameter(
    Number.isInteger(n) && n >= 1 && n <= MAX_TRIALS,
    `Binom: n, 1 ile ${formatNumber(MAX_TRIALS)} arasında bir tam sayı olmalıdır.`,
  );
  requireParameter(p >= 0 && p <= 1, 'Binom: p, 0 ile 1 arasında olmalıdır.');

  const pmf = (k: number) =>
    Math.exp(
      logGamma(n + 1) -
        logGamma(k + 1) -
        logGamma(n - k + 1) +
        times(k, Math.log(p)) +
        times(n - k, Math.log1p(-p)),
    );

  // Sums from `from` outwards into a tail and stops once the terms no longer matter.
  const sum = (from: number, step: 1 | -1) => {
    let total = 0;
    for (let k = from; k >= 0 && k <= n; k += step) {
      const term = pmf(k);
      total += term;
      if (term <= total * Number.EPSILON && (k - n * p) * step > 0) break;
    }
    return total;
  };

  // The tail that does not contain the mean is summed; the other one is its complement.
  return discreteDistribution({
    support: { min: 0, max: n, integer: true },
    density: pmf,
    cdf: (k) => (k < n * p ? sum(k, -1) : 1 - sum(k + 1, 1)),
    sf: (k) => (k < n * p ? 1 - sum(k, -1) : sum(k + 1, 1)),
  });
}

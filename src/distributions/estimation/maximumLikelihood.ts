import { digamma } from '../../math/gamma';
import { findRoot } from '../../math/rootFinding';
import { describe, type DescriptiveStatistics } from '../../math/statistics';
import type { DistributionId } from '../catalog';
import { M2_NOTE, momentEstimates, NO_SPREAD, sigmaEstimates } from './moments';
import { fitted, unavailable, type EstimationOptions, type Fit } from './types';

/** Solves ln α - ψ(α) = s for s > 0; the left side decreases from ∞ to 0. */
function gammaShape(s: number): number {
  const f = (alpha: number) => Math.log(alpha) - digamma(alpha) - s;
  // Minka's closed-form approximation as the starting point of the bracket.
  let lower = (3 - s + Math.sqrt((s - 3) ** 2 + 24 * s)) / (12 * s);
  let upper = lower;
  while (f(lower) < 0) lower /= 2;
  while (f(upper) > 0) upper *= 2;
  return findRoot(f, lower, upper);
}

/** Maximum likelihood from exact observations (raw data or a frequency table). */
export function maximumLikelihood(
  id: DistributionId,
  values: readonly number[],
  frequencies: readonly number[],
  statistics: DescriptiveStatistics,
  options: EstimationOptions,
): Fit {
  const { n: count, mean, min, max } = statistics;

  switch (id) {
    // For these the likelihood equations give the same solution as the moments.
    case 'binomial':
    case 'bernoulli':
    case 'poisson':
    case 'geometric':
    case 'exponential':
    case 'normal':
      return momentEstimates(id, statistics, options);
    case 'discreteUniform':
    case 'continuousUniform':
      if (id === 'continuousUniform' && min === max) return unavailable(NO_SPREAD);
      return fitted(
        [
          { symbol: 'a', value: min, formula: '\\hat a=\\min x_i' },
          { symbol: 'b', value: max, formula: '\\hat b=\\max x_i' },
        ],
        [min, max],
      );
    case 'gamma': {
      if (min === max) return unavailable(NO_SPREAD);
      // s = ln x̄ - mean(ln x), written so that nearly equal values do not cancel.
      let sum = 0;
      values.forEach((x, i) => {
        if (frequencies[i]! > 0) sum += frequencies[i]! * Math.log1p((x - mean) / mean);
      });
      const s = -sum / count;
      if (!(s > 0)) return unavailable(NO_SPREAD);
      const alpha = gammaShape(s);
      return fitted(
        [
          {
            symbol: 'α',
            value: alpha,
            formula:
              '\\ln\\hat\\alpha-\\psi(\\hat\\alpha)=\\ln\\bar x-\\overline{\\ln x}',
          },
          { symbol: 'θ', value: mean / alpha, formula: '\\hat\\theta=\\bar x/\\hat\\alpha' },
        ],
        [alpha, mean / alpha],
        ['α denklemi sayısal kök bulma (Brent) ile çözüldü.'],
      );
    }
    case 'logNormal': {
      const logs = describe(
        values.map((x, i) => (frequencies[i]! > 0 ? Math.log(x) : 0)),
        frequencies,
      );
      if (logs.momentVariance <= 0) return unavailable(NO_SPREAD);
      return fitted(
        [
          { symbol: 'μ', value: logs.mean, formula: '\\hat\\mu=\\frac1N\\sum\\ln x_i' },
          ...sigmaEstimates(
            logs.momentVariance,
            '\\hat\\sigma^2=\\frac1N\\sum(\\ln x_i-\\hat\\mu)^2',
          ),
        ],
        [logs.mean, Math.sqrt(logs.momentVariance)],
        [M2_NOTE, 'EÇOK hesabında m₂, ln x değerleri üzerinden alınır.'],
      );
    }
  }
}

import { describe, expect, it } from 'vitest';
import { checkData, DISTRIBUTIONS, type DistributionId } from '../../src/distributions/catalog';
import { continuousUniform } from '../../src/distributions/continuous/continuousUniform';
import { exponential } from '../../src/distributions/continuous/exponential';
import { gammaDistribution } from '../../src/distributions/continuous/gammaDistribution';
import { logNormal } from '../../src/distributions/continuous/logNormal';
import { normal } from '../../src/distributions/continuous/normal';
import { intervalProbability, isInSupport } from '../../src/distributions/createDistribution';
import { bernoulli } from '../../src/distributions/discrete/bernoulli';
import { binomial } from '../../src/distributions/discrete/binomial';
import { discreteUniform } from '../../src/distributions/discrete/discreteUniform';
import { geometric } from '../../src/distributions/discrete/geometric';
import { poisson } from '../../src/distributions/discrete/poisson';
import type { Distribution } from '../../src/distributions/distributionTypes';
import { integrate } from '../../src/math/numericalIntegration';

const all: [string, Distribution][] = [
  ['binomial', binomial(12, 0.35)],
  ['poisson', poisson(3.2)],
  ['discreteUniform', discreteUniform(-2, 5)],
  ['geometric trials', geometric(0.3)],
  ['geometric failures', geometric(0.3, 'failures')],
  ['bernoulli', bernoulli(0.7)],
  ['normal', normal(5, 2)],
  ['exponential', exponential(0.4)],
  ['continuousUniform', continuousUniform(-1, 7)],
  ['gamma', gammaDistribution(2.5, 1.2)],
  ['logNormal', logNormal(0.5, 0.6)],
];

describe.each(all)('%s: consistency', (_name, d) => {
  const points = [-Infinity, -5, -1, 0, 0.5, 1, 2, 3.7, 7, 12, 40, Infinity];

  it('has CDF + SF = 1 and a non-decreasing CDF', () => {
    let previous = 0;
    for (const x of points) {
      expect(d.cdf(x) + d.sf(x)).toBeCloseTo(1, 12);
      expect(d.cdf(x)).toBeGreaterThanOrEqual(previous);
      previous = d.cdf(x);
    }
    expect(d.cdf(-Infinity)).toBe(0);
    expect(d.cdf(Infinity)).toBe(1);
  });

  it('splits the whole line into classes whose probabilities sum to 1', () => {
    const edges = [-Infinity, 0, 1, 2, 4, 9, Infinity];
    let total = 0;
    for (let i = 1; i < edges.length; i++) {
      // Discrete classes must not share their boundary integer.
      const lower = d.kind === 'discrete' && i > 1 ? edges[i - 1]! + 1 : edges[i - 1]!;
      total += intervalProbability(d, lower, edges[i]!);
    }
    expect(total).toBeCloseTo(1, 12);
  });

  it('has a PMF or PDF that agrees with the CDF', () => {
    if (d.kind === 'discrete') {
      let sum = 0;
      for (let k = -3; k <= 15; k++) {
        sum += d.pmf(k);
        expect(sum).toBeCloseTo(d.cdf(k), 12);
      }
      expect(d.pmf(1.5)).toBe(0);
    } else {
      const lower = Math.max(d.support.min, -20) + 1e-9;
      for (const upper of [lower + 0.5, lower + 3, lower + 6.5]) {
        expect(integrate(d.pdf, lower, Math.min(upper, d.support.max))).toBeCloseTo(
          d.cdf(upper) - d.cdf(lower),
          8,
        );
      }
    }
  });

  it('rejects NaN', () => {
    expect(() => d.cdf(NaN)).toThrow(RangeError);
    expect(() => d.sf(NaN)).toThrow(RangeError);
  });
});

describe('textbook values', () => {
  it('Bernoulli', () => {
    const d = bernoulli(0.7);
    expect(d.pmf(1)).toBeCloseTo(0.7, 15);
    expect(d.pmf(0)).toBeCloseTo(0.3, 15);
    expect(d.pmf(2)).toBe(0);
  });

  it('discrete uniform (fair die)', () => {
    const die = discreteUniform(1, 6);
    expect(die.pmf(4)).toBeCloseTo(1 / 6, 15);
    expect(die.cdf(2.9)).toBeCloseTo(1 / 3, 15);
    expect(die.pmf(7)).toBe(0);
    expect(intervalProbability(die, 2, 4)).toBeCloseTo(0.5, 15);
  });

  it('continuous uniform', () => {
    const d = continuousUniform(2, 10);
    expect(d.pdf(5)).toBe(0.125);
    expect(d.pdf(11)).toBe(0);
    expect(d.cdf(4)).toBe(0.25);
    expect(d.sf(4)).toBe(0.75);
  });

  it('geometric definitions are shifted by one', () => {
    const trials = geometric(0.2);
    const failures = geometric(0.2, 'failures');
    expect(trials.pmf(3)).toBeCloseTo(0.8 * 0.8 * 0.2, 15);
    expect(failures.pmf(2)).toBe(trials.pmf(3));
    expect(failures.cdf(4)).toBe(trials.cdf(5));
    expect(trials.pmf(0)).toBe(0);
    expect(failures.pmf(0)).toBeCloseTo(0.2, 15);
  });

  it('handles degenerate probabilities', () => {
    for (const [d, certain] of [
      [binomial(5, 0), 0],
      [binomial(5, 1), 5],
      [geometric(1), 1],
      [geometric(1, 'failures'), 0],
      [bernoulli(0), 0],
    ] as const) {
      expect(d.pmf(certain)).toBe(1);
      expect(d.pmf(certain + 1)).toBe(0);
      expect(d.cdf(certain)).toBe(1);
      expect(d.cdf(certain - 1)).toBe(0);
      expect(d.sf(certain - 1)).toBe(1);
    }
  });

  it('keeps binomial tails accurate for a large n', () => {
    const d = binomial(100_000, 0.5);
    expect(d.cdf(49_999) + d.pmf(50_000) / 2).toBeCloseTo(0.5, 8);
    expect(d.sf(99_000)).toBe(0);
  });
});

describe('intervalProbability', () => {
  it('keeps precision far in the upper tail', () => {
    const p = intervalProbability(normal(0, 1), 10, 11);
    // Reference from mpmath; computing it as CDF(11) - CDF(10) would give 0.
    expect(p / 7.619661958203076e-24).toBeCloseTo(1, 12);
  });

  it('includes both ends of a discrete interval', () => {
    const d = poisson(2);
    expect(intervalProbability(d, 3, 3)).toBe(d.pmf(3));
    expect(intervalProbability(d, 1.5, 3.5)).toBeCloseTo(d.pmf(2) + d.pmf(3), 14);
    expect(intervalProbability(d, 2.2, 2.8)).toBe(0);
    expect(intervalProbability(d, 3, Infinity)).toBeCloseTo(d.sf(2), 15);
  });

  it('gives a single point probability 0 for continuous distributions', () => {
    expect(intervalProbability(normal(0, 1), 1, 1)).toBe(0);
  });

  it('rejects reversed and NaN bounds', () => {
    expect(() => intervalProbability(poisson(1), 3, 2)).toThrow(RangeError);
    expect(() => intervalProbability(poisson(1), NaN, 2)).toThrow(RangeError);
  });
});

describe('parameter validation', () => {
  it.each([
    ['binomial n = 0', () => binomial(0, 0.5)],
    ['binomial n = 2.5', () => binomial(2.5, 0.5)],
    ['binomial p > 1', () => binomial(5, 1.2)],
    ['bernoulli p < 0', () => bernoulli(-0.1)],
    ['poisson λ = 0', () => poisson(0)],
    ['poisson λ = ∞', () => poisson(Infinity)],
    ['discrete uniform a > b', () => discreteUniform(3, 1)],
    ['discrete uniform non-integer', () => discreteUniform(0.5, 3)],
    ['geometric p = 0', () => geometric(0)],
    ['normal σ = 0', () => normal(0, 0)],
    ['normal μ = NaN', () => normal(NaN, 1)],
    ['exponential λ < 0', () => exponential(-1)],
    ['continuous uniform a = b', () => continuousUniform(1, 1)],
    ['gamma α = 0', () => gammaDistribution(0, 1)],
    ['gamma θ < 0', () => gammaDistribution(1, -1)],
    ['log-normal σ = NaN', () => logNormal(0, NaN)],
  ])('rejects %s', (_name, create) => {
    expect(create).toThrow(RangeError);
  });
});

describe('data support', () => {
  it.each<[DistributionId, number[], number[]]>([
    ['binomial', [0, 5], [-1]],
    ['poisson', [0, 100], [-1]],
    ['poisson', [3], [2.5]],
    ['discreteUniform', [-4, 4], [0.5]],
    ['geometric', [1, 9], [0]],
    ['bernoulli', [0, 1], [2]],
    ['normal', [-3.5, 3.5], [Infinity]],
    ['exponential', [0, 2.5], [-0.1]],
    ['continuousUniform', [-3.5, 3.5], [NaN]],
    ['gamma', [0.001], [0]],
    ['logNormal', [0.001], [0]],
  ])('%s accepts %j and rejects %j', (id, valid, invalid) => {
    expect(checkData(id, valid)).toBeNull();
    expect(checkData(id, [...valid, ...invalid])).toContain(DISTRIBUTIONS[id].name);
  });

  it('uses the binomial n and the geometric definition', () => {
    expect(checkData('binomial', [6], { n: 5 })).toContain('0 ile 5 arasında');
    expect(checkData('geometric', [0], { geometricDefinition: 'failures' })).toBeNull();
  });

  it('matches the support of the distribution itself', () => {
    expect(isInSupport(gammaDistribution(1, 1).support, 0)).toBe(false);
    expect(gammaDistribution(1, 1).pdf(0)).toBe(0);
    expect(exponential(2).pdf(0)).toBe(2);
    expect(Object.keys(DISTRIBUTIONS)).toHaveLength(10);
  });
});

import { describe, expect, it } from 'vitest';
import { chiSquareTest } from '../../src/chiSquare/hypothesisTest';
import { DISTRIBUTIONS, type DistributionId } from '../../src/distributions/catalog';
import { manualParameters } from '../../src/distributions/estimation/estimate';
import type { Observations } from '../../src/distributions/estimation/types';
import { defaultBounds } from '../../src/features/probability-calculator/calculate';
import { interpret } from '../../src/features/reporting/interpretation';
import { integrate } from '../../src/math/numericalIntegration';

const cases: [DistributionId, number[]][] = [
  ['binomial', [12, 0.35]],
  ['poisson', [3.2]],
  ['discreteUniform', [-2, 5]],
  ['geometric', [0.3]],
  ['bernoulli', [0.7]],
  ['normal', [65.125, 13.92]],
  ['exponential', [0.2554]],
  ['continuousUniform', [-1, 7]],
  ['gamma', [2.5, 1.2]],
  ['logNormal', [0.5, 0.6]],
];

describe('distribution means', () => {
  it.each(cases)('%s agrees with the PMF or density', (id, params) => {
    const { create, mean } = DISTRIBUTIONS[id];
    const d = create(params);
    let expected = 0;
    if (d.kind === 'discrete') {
      for (let k = -2; k <= 200; k++) expected += k * d.pmf(k);
    } else {
      const from = Math.max(d.support.min, -40);
      const to = Math.min(d.support.max, 200);
      expected = integrate((x) => x * d.pdf(x), from, to, 1e-11);
    }
    expect(mean(params)).toBeCloseTo(expected, 6);
  });

  it('follows the geometric definition', () => {
    expect(DISTRIBUTIONS.geometric.mean([0.25], { geometricDefinition: 'failures' })).toBe(3);
  });
});

describe('calculator defaults', () => {
  it.each(cases)('%s shows a visible area', (id, params) => {
    const { create, mean } = DISTRIBUTIONS[id];
    const d = create(params);
    const { a, b } = defaultBounds(d, mean(params));
    expect(b).toBeGreaterThanOrEqual(a);
    expect(d.cdf(a)).toBeGreaterThan(0);
    if (d.kind === 'continuous') {
      expect(b).toBeGreaterThan(a);
      expect(d.cdf(b) - d.cdf(a)).toBeGreaterThan(0.05);
    }
  });

  it('rounds the mean to the scale of the distribution', () => {
    const normal = DISTRIBUTIONS.normal.create([65.125, 13.92]);
    expect(defaultBounds(normal, 65.125).a).toBe(65);
    const tiny = DISTRIBUTIONS.normal.create([0.0012345, 0.0001]);
    expect(defaultBounds(tiny, 0.0012345).a).toBe(0.00123);
    const poisson = DISTRIBUTIONS.poisson.create([1.95]);
    expect(defaultBounds(poisson, 1.95).a).toBe(2);
  });
});

describe('statistical interpretation', () => {
  const data: Observations = {
    type: 'values',
    values: [0, 1, 2, 3, 4],
    frequencies: [109, 65, 22, 3, 1],
  };
  const run = (lambda: number, estimated = false) =>
    chiSquareTest(
      'poisson',
      data,
      manualParameters('poisson', [{ value: lambda, estimatedFromData: estimated }]),
    );

  it('reports the numbers and never claims the distribution is correct', () => {
    const text = interpret('Poisson', 'manual', run(0.61), false).join(' ');
    expect(text).toContain('200 gözlemlik');
    expect(text).toContain('birleştirme öncesi 5, sonrası 3');
    expect(text).toContain('χ² = ');
    expect(text).toContain('doğru olduğu anlamına gelmez');
    expect(text).not.toContain('yaklaşıktır');
  });

  it('states a rejection without the non-rejection caveat', () => {
    const text = interpret('Poisson', 'manual', run(3), false).join(' ');
    expect(text).toContain('H₀ reddedilir');
    expect(text).not.toContain('doğru olduğu anlamına gelmez');
  });

  it('mentions approximate p-values and midpoint statistics', () => {
    const text = interpret('Poisson', 'mle', run(0.61, true), true).join(' ');
    expect(text).toContain('p-değeri yaklaşıktır');
    expect(text).toContain('orta noktalarından');
  });

  it('explains a test without a result', () => {
    const impossible = chiSquareTest(
      'bernoulli',
      { type: 'values', values: [0, 1], frequencies: [5, 5] },
      manualParameters('bernoulli', [{ value: 0, estimatedFromData: false }]),
    );
    const text = interpret('Bernoulli', 'manual', impossible, false).join(' ');
    expect(text).toContain('sonuçlandırılamamıştır');
    expect(text).not.toContain('χ² = ');
  });
});

import { describe, expect, it } from 'vitest';
import type { DistributionId } from '../../src/distributions/catalog';
import { estimateParameters, manualParameters } from '../../src/distributions/estimation/estimate';
import type {
  Estimation,
  EstimationOptions,
  Observations,
} from '../../src/distributions/estimation/types';
import references from './references.json';

function params(e: Estimation): number[] {
  if (!e.available) throw new Error(e.reason);
  return e.params;
}

function expectParams(e: Estimation, expected: number[], tolerance = 1e-12): void {
  const actual = params(e);
  expect(actual).toHaveLength(expected.length);
  actual.forEach((value, i) => {
    const error = Math.abs(value - expected[i]!) / Math.max(1, Math.abs(expected[i]!));
    expect(error, `got ${actual}, expected ${expected}`).toBeLessThanOrEqual(tolerance);
  });
}

const raw = (values: number[], frequencies?: number[]): Observations => ({
  type: 'values',
  values,
  frequencies,
});

const classes = (bounds: number[], frequencies: number[]): Observations => ({
  type: 'classes',
  classes: frequencies.map((frequency, i) => ({
    lower: bounds[i]!,
    upper: bounds[i + 1]!,
    frequency,
  })),
});

describe('raw data and frequency tables', () => {
  // N = 8, mean 5, m2 = 4.
  const data = [2, 4, 4, 4, 5, 5, 7, 9];
  const logs = data.map(Math.log);
  const logMean = logs.reduce((a, b) => a + b) / 8;
  const logVariance = logs.reduce((a, b) => a + (b - logMean) ** 2, 0) / 8;
  const lnVariance = Math.log(1 + 4 / 25);

  it.each<[DistributionId, number[], number[], EstimationOptions?]>([
    ['poisson', [5], [5]],
    ['binomial', [10, 0.5], [10, 0.5], { n: 10 }],
    ['geometric', [0.2], [0.2]],
    ['geometric', [1 / 6], [1 / 6], { geometricDefinition: 'failures' }],
    ['normal', [5, 2], [5, 2]],
    ['exponential', [0.2], [0.2]],
    ['continuousUniform', [5 - Math.sqrt(12), 5 + Math.sqrt(12)], [2, 9]],
    ['gamma', [6.25, 0.8], []],
    [
      'logNormal',
      [Math.log(5) - lnVariance / 2, Math.sqrt(lnVariance)],
      [logMean, Math.sqrt(logVariance)],
    ],
  ])('%s: moments %j, likelihood %j', (id, mm, mle, options) => {
    const result = estimateParameters(id, raw(data), options);
    expectParams(result.mm, mm);
    if (mle.length) expectParams(result.mle, mle);
  });

  it('solves the gamma likelihood equation', () => {
    const { values, alpha, theta } = references.gammaRaw;
    expectParams(estimateParameters('gamma', raw(values)).mle, [alpha, theta]);
  });

  it('handles gamma data with a very small spread', () => {
    const mle = params(estimateParameters('gamma', raw([1000, 1000.01, 999.99])).mle);
    expect(mle[0]! * mle[1]!).toBeCloseTo(1000, 6);
    // For a large shape, alpha ≈ mean² / m2 = 1.5e10.
    expect(mle[0]! / 1.5e10).toBeCloseTo(1, 4);
  });

  it('estimates Bernoulli p from a frequency table', () => {
    const { mm, mle } = estimateParameters('bernoulli', raw([0, 1], [30, 70]));
    expectParams(mm, [0.7]);
    expectParams(mle, [0.7]);
  });

  it('estimates the discrete uniform bounds and rounds the moment result', () => {
    const { mm, mle } = estimateParameters('discreteUniform', raw([1, 2, 3, 4, 5, 6]));
    expectParams(mm, [1, 6]);
    expectParams(mle, [1, 6]);
    if (!mm.available) throw new Error(mm.reason);
    expect(mm.estimates[0]!.value).toBeCloseTo(1, 12);

    const skewed = estimateParameters('discreteUniform', raw([1, 2, 10], [10, 10, 1])).mm;
    expect(skewed.available && skewed.notes.join(' ')).toContain('kapsamıyor');
  });

  it('reports both sigma and sigma squared with the m2 note', () => {
    for (const id of ['normal', 'logNormal'] as const) {
      const { mm, mle } = estimateParameters(id, raw(data));
      for (const e of [mm, mle]) {
        if (!e.available) throw new Error(e.reason);
        const [, sigma, variance] = e.estimates;
        expect(e.estimates.map((x) => x.symbol)).toEqual(['μ', 'σ', 'σ²']);
        expect(sigma!.value ** 2).toBeCloseTo(variance!.value, 12);
        expect(e.notes.join(' ')).toContain("N'e bölünen m₂");
        expect(e.estimatedCount).toBe(2);
      }
    }
  });

  it('flags the p-value as approximate depending on how the estimate was obtained', () => {
    const flags = (e: Estimation) =>
      e.available && [e.pValueApproximate, e.approximateIfMerged];
    const continuous = estimateParameters('normal', raw(data));
    expect(flags(continuous.mm)).toEqual([true, false]);
    expect(flags(continuous.mle)).toEqual([true, false]);
    expect(continuous.mle.available && continuous.mle.notes.join(' ')).toContain(
      'p-değeri yaklaşıktır',
    );
    const discrete = estimateParameters('poisson', raw([0, 1, 2], [3, 4, 5]));
    expect(flags(discrete.mm)).toEqual([true, false]);
    expect(flags(discrete.mle)).toEqual([false, true]);
    expect(discrete.mle.available && discrete.mle.notes.join(' ')).not.toContain('yaklaşıktır');
  });

  it('counts only p for the binomial distribution', () => {
    const { mle } = estimateParameters('binomial', raw(data), { n: 10 });
    expect(mle.available && mle.estimatedCount).toBe(1);
  });

  it.each<[DistributionId, number[]]>([
    ['normal', [3, 3, 3]],
    ['gamma', [3, 3, 3]],
    ['logNormal', [3, 3]],
    ['continuousUniform', [3]],
    ['poisson', [0, 0]],
  ])('%s explains why %j cannot be estimated', (id, values) => {
    const { mm, mle } = estimateParameters(id, raw(values));
    expect(mm.available).toBe(false);
    expect(mle.available).toBe(false);
  });
});

describe('grouped data', () => {
  const rows = references.grouped as [DistributionId, (number | null)[], number[], number[]][];

  it.each(rows)('%s likelihood against mpmath %j', (id, bounds, frequencies, expected) => {
    const numeric = bounds.map((b, i) => b ?? (i === 0 ? -Infinity : Infinity));
    const { mle } = estimateParameters(id, classes(numeric, frequencies));
    expectParams(mle, expected, 1e-6);
    expect(mle.available && [mle.pValueApproximate, mle.approximateIfMerged]).toEqual([
      false,
      true,
    ]);
  });

  it('matches the closed form for equal width exponential classes', () => {
    // Classes [0,2), [2,4), [4,∞): q = e^(-2λ) = (f2 + 2 f3) / (f1 + 2 f2 + 2 f3).
    const { mle } = estimateParameters('exponential', classes([0, 2, 4, Infinity], [50, 30, 20]));
    expectParams(mle, [-Math.log(70 / 150) / 2], 1e-7);
  });

  it('finds uniform bounds on the class edges and inside the end classes', () => {
    const flat = estimateParameters('continuousUniform', classes([0, 1, 2, 3], [10, 10, 10]));
    expectParams(flat.mle, [0, 3], 1e-6);
    const thin = estimateParameters('continuousUniform', classes([0, 1, 2, 3], [5, 10, 5]));
    expectParams(thin.mle, [0.5, 2.5], 1e-6);
  });

  it('computes moments from midpoints and marks them approximate', () => {
    const { mm } = estimateParameters('normal', classes([0, 2, 4, 6], [1, 2, 1]));
    expectParams(mm, [3, Math.SQRT2]);
    expect(mm.available && mm.notes.join(' ')).toContain('yaklaşık');
  });

  it('explains why moments are unavailable with open classes', () => {
    const { mm, mle } = estimateParameters(
      'normal',
      classes([-Infinity, 2, 4, Infinity], [5, 10, 5]),
    );
    expect(mm.available).toBe(false);
    expect(!mm.available && mm.reason).toContain('Açık uçlu');
    expect(params(mle)[0]).toBeCloseTo(3, 6);
  });

  it.each<[DistributionId, number[], number[]]>([
    ['normal', [0, 1, 2, 3], [5, 5, 0]],
    ['exponential', [0, 1, 2], [10, 0]],
    ['exponential', [0, 1, Infinity], [0, 10]],
  ])('%s has no finite solution for %j %j', (id, bounds, frequencies) => {
    expect(estimateParameters(id, classes(bounds, frequencies)).mle.available).toBe(false);
  });
});

describe('discrete open tail', () => {
  const open = (frequencies: number[], from: number, frequency: number, first = 0) =>
    ({
      type: 'values',
      values: frequencies.map((_, i) => i + first),
      frequencies,
      openTail: { from, frequency },
    }) satisfies Observations;

  it('maximizes the censored Poisson likelihood', () => {
    const r = references.censoredPoisson;
    const { mm, mle } = estimateParameters(
      'poisson',
      open(r.frequencies, r.tailFrom, r.tailFrequency),
    );
    expect(mm.available).toBe(false);
    expectParams(mle, [r.lambda], 1e-7);
  });

  it('matches the closed form of the censored geometric likelihood', () => {
    // p = uncensored / (Σ f x + tail · (k - 1)) = 85 / (50 + 50 + 30 + 10 · 3)
    const { mle } = estimateParameters('geometric', open([50, 25, 10], 4, 10, 1));
    const uncensored = 50 + 25 + 10;
    expectParams(mle, [uncensored / (50 + 50 + 30 + 30)], 1e-7);
  });

  it('keeps the binomial n fixed', () => {
    const { mle } = estimateParameters('binomial', open([10, 20, 30], 3, 15), { n: 5 });
    expect(params(mle)[0]).toBe(5);
    expect(mle.available && mle.estimates.map((e) => e.symbol)).toEqual(['p']);
  });

  it('uses the ordinary estimators when the tail is empty', () => {
    const { mm } = estimateParameters('poisson', open([1, 1, 1], 3, 0));
    expectParams(mm, [1]);
  });

  it('has no solution when everything is in the tail', () => {
    expect(estimateParameters('poisson', open([0, 0], 2, 10)).mle.available).toBe(false);
  });
});

describe('invalid observations', () => {
  it.each<[string, DistributionId, Observations, EstimationOptions?]>([
    ['negative count', 'poisson', raw([-1, 2])],
    ['missing binomial n', 'binomial', raw([1, 2])],
    ['value above n', 'binomial', raw([6]), { n: 5 }],
    ['negative frequency', 'poisson', raw([1, 2], [1, -1])],
    ['no observations', 'poisson', raw([])],
    ['length mismatch', 'poisson', raw([1, 2], [1])],
    ['classes for a discrete distribution', 'poisson', classes([0, 1], [3])],
    ['gap between classes', 'normal', {
      type: 'classes',
      classes: [
        { lower: 0, upper: 1, frequency: 1 },
        { lower: 2, upper: 3, frequency: 1 },
      ],
    }],
    ['reversed class', 'normal', classes([2, 1], [3])],
    ['class below the support', 'exponential', classes([-2, 1, 2], [3, 3])],
    ['empty classes', 'normal', classes([0, 1, 2], [0, 0])],
    ['overlapping open tail', 'poisson', {
      type: 'values', values: [0, 1, 2], openTail: { from: 2, frequency: 1 },
    }],
  ])('rejects %s', (_name, id, data, options) => {
    expect(() => estimateParameters(id, data, options)).toThrow(RangeError);
  });
});

describe('manual parameters', () => {
  it('counts only the parameters estimated from the data', () => {
    const external = manualParameters('normal', [
      { value: 100, estimatedFromData: false },
      { value: 15, estimatedFromData: false },
    ]);
    expect(external.estimatedCount).toBe(0);
    expect(external.pValueApproximate).toBe(false);
    expect(external.distribution.cdf(100)).toBeCloseTo(0.5, 15);

    const both = manualParameters('binomial', [
      { value: 8, estimatedFromData: true },
      { value: 0.4, estimatedFromData: true },
    ]);
    expect(both.estimatedCount).toBe(2);
    expect(both.pValueApproximate).toBe(true);
  });

  it('validates values and the number of parameters', () => {
    expect(() => manualParameters('poisson', [{ value: -1, estimatedFromData: false }])).toThrow(
      RangeError,
    );
    expect(() => manualParameters('normal', [{ value: 0, estimatedFromData: false }])).toThrow(
      RangeError,
    );
  });
});

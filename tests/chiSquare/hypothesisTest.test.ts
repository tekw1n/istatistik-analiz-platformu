import { describe, expect, it } from 'vitest';
import { chiSquareTest } from '../../src/chiSquare/hypothesisTest';
import type { ChiSquareResult, FittedModel } from '../../src/chiSquare/types';
import { estimateParameters, manualParameters } from '../../src/distributions/estimation/estimate';
import type { Estimation, Observations } from '../../src/distributions/estimation/types';
import references from './references.json';

const table = (frequencies: number[], first = 0): Observations => ({
  type: 'values',
  values: frequencies.map((_, i) => i + first),
  frequencies,
});

const grouped = (bounds: number[], frequencies: number[]): Observations => ({
  type: 'classes',
  classes: frequencies.map((frequency, i) => ({
    lower: bounds[i]!,
    upper: bounds[i + 1]!,
    frequency,
  })),
});

const external = (...values: number[]) =>
  values.map((value) => ({ value, estimatedFromData: false }));

function model(e: Estimation): FittedModel {
  if (!e.available) throw new Error(e.reason);
  return e;
}

function ok(r: ChiSquareResult) {
  if (r.status !== 'ok') throw new Error(r.reason);
  return r;
}

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

function expectReference(r: ChiSquareResult, reference: (typeof references)['poisson']) {
  const result = ok(r);
  const close = (actual: number, expected: number) =>
    expect(Math.abs(actual - expected) / expected).toBeLessThan(1e-11);
  result.rawRows.forEach((row, i) => close(row.expected, reference.expected[i]!));
  expect(result.mergedRows.map((row) => row.observed)).toEqual(reference.mergedObserved);
  result.mergedRows.forEach((row, i) => close(row.expected, reference.mergedExpected[i]!));
  expect(result.degreesOfFreedom).toBe(reference.df);
  close(result.statistic, reference.statistic);
  close(result.pValue, reference.pValue);
  close(result.criticalValue, reference.criticalValue);
  expect(sum(result.rawRows.map((row) => row.probability))).toBeCloseTo(1, 12);
  expect(sum(result.rawRows.map((row) => row.expected))).toBeCloseTo(result.total, 9);
  expect(sum(result.mergedRows.map((row) => row.contribution!))).toBe(result.statistic);
  return result;
}

describe('end-to-end examples', () => {
  const horseKicks = table([109, 65, 22, 3, 1]);

  it.each(['mm', 'mle'] as const)('Poisson, horse kicks (%s)', (method) => {
    const estimates = estimateParameters('poisson', horseKicks);
    const r = expectReference(
      chiSquareTest('poisson', horseKicks, model(estimates[method])),
      references.poisson,
    );
    expect(r.rejectNull).toBe(false);
    expect(r.history).toHaveLength(2);
    expect(r.rawRows[4]).toMatchObject({ lower: 4, upper: Infinity, observed: 1 });
    expect(r.pValueApproximate).toBe(true);
    expect(r.conclusion).toContain('reddedilemez');
  });

  it('Binomial with known p rejects H0', () => {
    const coins = table([18, 56, 110, 88, 40, 8]);
    const manual = manualParameters('binomial', external(5, 0.5), { n: 5 });
    const r = expectReference(chiSquareTest('binomial', coins, manual), references.binomialKnown);
    expect(r.statistic).toBeCloseTo(11.96, 12);
    expect(r.rejectNull).toBe(true);
    expect(r.pValueApproximate).toBe(false);
    expect(ok(chiSquareTest('binomial', coins, manual, { alpha: 0.01 })).rejectNull).toBe(false);
  });

  it('Binomial with p estimated by maximum likelihood and no merging is not flagged', () => {
    const coins = table([18, 56, 110, 88, 40, 8]);
    const { mle } = estimateParameters('binomial', coins, { n: 5 });
    const r = expectReference(
      chiSquareTest('binomial', coins, model(mle)),
      references.binomialEstimated,
    );
    expect(r.history).toEqual([]);
    expect(r.pValueApproximate).toBe(false);
    expect(r.notes).toEqual([]);
  });

  it('Normal with open end classes', () => {
    const heights = grouped([-Infinity, 150, 160, 170, 180, 190, Infinity], [
      4, 15, 32, 30, 14, 5,
    ]);
    const manual = manualParameters('normal', external(170, 12));
    const r = expectReference(chiSquareTest('normal', heights, manual), references.normal);
    expect(r.notes).toEqual([]);
  });
});

describe('p-value flag', () => {
  it('turns on for a discrete likelihood fit only when classes are merged', () => {
    const data = table([109, 65, 22, 3, 1]);
    const { mle } = estimateParameters('poisson', data);
    const r = ok(chiSquareTest('poisson', data, model(mle)));
    expect(r.history.length).toBeGreaterThan(0);
    expect(r.pValueApproximate).toBe(true);
    expect(r.notes.join(' ')).toContain('birleştirildi');
  });

  it('stays off for grouped likelihood without merging', () => {
    const data = grouped([0, 2, 4, 6, 8, 10], [8, 20, 30, 18, 9]);
    const { mm, mle } = estimateParameters('normal', data);
    const fit = ok(chiSquareTest('normal', data, model(mle)));
    expect(fit.history).toEqual([]);
    expect(fit.pValueApproximate).toBe(false);
    expect(ok(chiSquareTest('normal', data, model(mm))).pValueApproximate).toBe(true);
  });

  it('stays off for external parameters even when classes are merged', () => {
    const data = table([109, 65, 22, 3, 1]);
    const r = ok(chiSquareTest('poisson', data, manualParameters('poisson', external(0.6))));
    expect(r.history.length).toBeGreaterThan(0);
    expect(r.pValueApproximate).toBe(false);
    expect(r.degreesOfFreedom).toBe(r.mergedRows.length - 1);
  });
});

describe('classes', () => {
  const poissonModel = manualParameters('poisson', external(2));

  it('fills missing categories with zero and closes the upper tail', () => {
    const r = chiSquareTest(
      'poisson',
      { type: 'values', values: [5, 2, 2], frequencies: [10, 20, 30] },
      poissonModel,
    );
    expect(r.rawRows.map((row) => row.observed)).toEqual([0, 0, 50, 0, 0, 10]);
    expect(r.rawRows.at(-1)!.upper).toBe(Infinity);
    expect(sum(r.rawRows.map((row) => row.expected))).toBeCloseTo(60, 10);
  });

  it('counts raw discrete observations', () => {
    const r = chiSquareTest('poisson', { type: 'values', values: [0, 1, 1, 3] }, poissonModel);
    expect(r.rawRows.map((row) => row.observed)).toEqual([1, 2, 0, 1]);
  });

  it('uses the open class as the last class', () => {
    const data: Observations = {
      type: 'values',
      values: [0, 1],
      frequencies: [20, 30],
      openTail: { from: 3, frequency: 25 },
    };
    const r = chiSquareTest('poisson', data, poissonModel);
    expect(r.rawRows.map((row) => [row.lower, row.upper, row.observed])).toEqual([
      [0, 0, 20],
      [1, 1, 30],
      [2, 2, 0],
      [3, Infinity, 25],
    ]);
  });

  it('covers the whole finite support', () => {
    const r = chiSquareTest(
      'binomial',
      table([30, 20], 2),
      manualParameters('binomial', external(6, 0.5), { n: 6 }),
    );
    expect(r.rawRows.map((row) => row.lower)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('opens the ends of a closed grouped table', () => {
    const data = grouped([2, 4, 6, 8], [40, 25, 15]);
    const r = chiSquareTest('exponential', data, manualParameters('exponential', external(0.3)));
    expect(r.rawRows[0]!.probability).toBeCloseTo(1 - Math.exp(-1.2), 14);
    expect(r.rawRows[2]!.probability).toBeCloseTo(Math.exp(-1.8), 14);
    expect(sum(r.rawRows.map((row) => row.expected))).toBeCloseTo(80, 10);
    expect(r.notes.join(' ')).toContain('açıldı');
  });

  it('keeps precision in a far continuous tail', () => {
    const data = grouped([-Infinity, 0, 10, Infinity], [10, 10, 0]);
    const r = chiSquareTest('normal', data, manualParameters('normal', external(0, 1)));
    expect(r.rawRows[2]!.probability / 7.619853024160527e-24).toBeCloseTo(1, 11);
  });
});

describe('cases without a test result', () => {
  it('reports sd <= 0', () => {
    const data = table([50, 50]);
    const { mle } = estimateParameters('bernoulli', data);
    const r = chiSquareTest('bernoulli', data, model(mle));
    expect(r.status).toBe('insufficient-df');
    if (r.status !== 'insufficient-df') return;
    expect(r.degreesOfFreedom).toBe(0);
    expect(r.reason).toContain('uygulanamaz');
    expect(r).not.toHaveProperty('pValue');
  });

  it('reports sd < 0 when everything merges into one class', () => {
    const data = table([1, 1, 1]);
    const { mle } = estimateParameters('poisson', data);
    const r = chiSquareTest('poisson', data, model(mle));
    expect(r.status).toBe('insufficient-df');
    expect(r.mergedRows).toHaveLength(1);
  });

  it.each<[string, () => ChiSquareResult]>([
    [
      'data outside a discrete uniform range',
      () =>
        chiSquareTest(
          'discreteUniform',
          table([10, 10, 10, 10], 1),
          manualParameters('discreteUniform', external(1, 3)),
        ),
    ],
    [
      'a class outside a continuous uniform range',
      () =>
        chiSquareTest(
          'continuousUniform',
          grouped([0, 1, 2, 3], [10, 10, 10]),
          manualParameters('continuousUniform', external(0, 1.5)),
        ),
    ],
    [
      'a degenerate binomial model',
      () =>
        chiSquareTest(
          'binomial',
          table([10, 10]),
          manualParameters('binomial', external(1, 0), { n: 1 }),
        ),
    ],
  ])('reports E = 0 with O > 0: %s', (_name, run) => {
    const r = run();
    expect(r.status).toBe('impossible');
    expect(r.mergedRows).toEqual([]);
    expect(r.rawRows.some((row) => row.contribution === null)).toBe(true);
    expect(r).not.toHaveProperty('statistic');
  });

  it('accepts E = 0 with O = 0', () => {
    const r = ok(
      chiSquareTest(
        'continuousUniform',
        grouped([0, 1, 2, 3], [10, 10, 0]),
        manualParameters('continuousUniform', external(0, 2)),
      ),
    );
    expect(r.rawRows[2]!.contribution).toBe(0);
    expect(r.statistic).toBeCloseTo(0, 12);
  });
});

describe('invalid input', () => {
  const data = table([10, 10, 10]);
  const poissonModel = manualParameters('poisson', external(1));

  it.each([0, 1, -0.1, NaN])('rejects alpha = %s', (alpha) => {
    expect(() => chiSquareTest('poisson', data, poissonModel, { alpha })).toThrow(RangeError);
  });

  it('rejects unusable data and models', () => {
    expect(() =>
      chiSquareTest('normal', data, manualParameters('normal', external(0, 1))),
    ).toThrow('sınıflandırılmalıdır');
    expect(() =>
      chiSquareTest('poisson', data, { ...poissonModel, estimatedCount: 0.5 }),
    ).toThrow(RangeError);
    expect(() => chiSquareTest('poisson', table([1, 1], -1), poissonModel)).toThrow(RangeError);
    expect(() =>
      chiSquareTest('poisson', { type: 'values', values: [0, 20_000] }, poissonModel),
    ).toThrow(RangeError);
  });
});

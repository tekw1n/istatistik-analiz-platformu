import { describe, expect, it } from 'vitest';
import { erf, erfc } from '../../src/math/erf';
import {
  digamma,
  gamma,
  inverseRegularizedGammaQ,
  logGamma,
  regularizedGammaP,
  regularizedGammaQ,
} from '../../src/math/gamma';
import { normalCdf, normalSf } from '../../src/math/normal';
import references from './references.json';

/** Relative error, or absolute error when the reference is exactly zero. */
function expectClose(actual: number, expected: number, tolerance: number): void {
  const error = Math.abs(actual - expected) / (expected === 0 ? 1 : Math.abs(expected));
  expect(error, `got ${actual}, expected ${expected}`).toBeLessThanOrEqual(tolerance);
}

const unary: [string, (x: number) => number, number[][], number][] = [
  ['gamma', gamma, references.gamma, 1e-12],
  ['erf', erf, references.erf, 1e-13],
  ['erfc', erfc, references.erfc, 1e-12],
  ['normalCdf', (x) => normalCdf(x), references.normalCdf, 1e-12],
  ['normalSf', (x) => normalSf(x), references.normalSf, 1e-12],
];

describe.each(unary)('%s against mpmath', (_name, f, rows, tolerance) => {
  it.each(rows)('x = %s', (x, expected) => {
    expectClose(f(x!), expected!, tolerance);
  });
});

// Both functions cross zero, where only the absolute error is meaningful.
describe.each([
  ['logGamma', logGamma, references.logGamma],
  ['digamma', digamma, references.digamma],
])('%s against mpmath', (_name, f, rows) => {
  it.each(rows)('x = %s', (x, expected) => {
    expect(Math.abs(f(x!) - expected!)).toBeLessThanOrEqual(
      1e-14 + 1e-14 * Math.abs(expected!),
    );
  });
});

describe('regularized incomplete gamma against mpmath', () => {
  it.each(references.regularizedGammaP)('P(%s, %s)', (a, x, expected) => {
    expectClose(regularizedGammaP(a!, x!), expected!, a! > 100 ? 1e-10 : 1e-12);
  });
  it.each(references.regularizedGammaQ)('Q(%s, %s)', (a, x, expected) => {
    expectClose(regularizedGammaQ(a!, x!), expected!, a! > 100 ? 1e-10 : 1e-12);
  });
  it('handles the limits', () => {
    expect(regularizedGammaP(2, 0)).toBe(0);
    expect(regularizedGammaQ(2, 0)).toBe(1);
    expect(regularizedGammaP(2, Infinity)).toBe(1);
    expect(regularizedGammaQ(2, Infinity)).toBe(0);
  });
});

describe('chi-square critical values (inverse of Q)', () => {
  const critical = (df: number, alpha: number) => 2 * inverseRegularizedGammaQ(df / 2, alpha);

  // Printed textbook table, six decimals.
  it.each([
    [1, 0.05, 3.841459],
    [1, 0.01, 6.634897],
    [2, 0.05, 5.991465],
    [3, 0.05, 7.814728],
    [20, 0.05, 31.410433],
    [20, 0.01, 37.566235],
  ])('table: df = %s, alpha = %s', (df, alpha, expected) => {
    expect(Math.abs(critical(df, alpha) - expected)).toBeLessThan(5e-7);
  });

  it.each(references.chiSquareCritical)('mpmath: df = %s, alpha = %s', (df, alpha, expected) => {
    expectClose(critical(df!, alpha!), expected!, 1e-11);
  });

  it('handles the limits', () => {
    expect(inverseRegularizedGammaQ(3, 1)).toBe(0);
    expect(inverseRegularizedGammaQ(3, 0)).toBe(Infinity);
  });
});

describe('invalid input', () => {
  it.each([
    ['logGamma(0)', () => logGamma(0)],
    ['logGamma(NaN)', () => logGamma(NaN)],
    ['gamma(-2)', () => gamma(-2)],
    ['digamma(-1)', () => digamma(-1)],
    ['P(0, 1)', () => regularizedGammaP(0, 1)],
    ['Q(1, -1)', () => regularizedGammaQ(1, -1)],
    ['inverse q > 1', () => inverseRegularizedGammaQ(1, 1.5)],
    ['erf(NaN)', () => erf(NaN)],
    ['normal sd = 0', () => normalCdf(0, 0, 0)],
    ['normal x = NaN', () => normalSf(NaN)],
  ])('%s throws', (_name, call) => {
    expect(call).toThrow(RangeError);
  });

  it('overflows gamma to Infinity', () => {
    expect(gamma(172)).toBe(Infinity);
  });

  it('standardizes the normal distribution', () => {
    expect(normalCdf(110, 100, 10)).toBeCloseTo(0.8413447460685429, 14);
    expect(normalCdf(Infinity)).toBe(1);
    expect(normalCdf(-Infinity)).toBe(0);
  });
});

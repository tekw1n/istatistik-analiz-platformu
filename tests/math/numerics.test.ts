import { describe, expect, it } from 'vitest';
import { logGamma, regularizedGammaP } from '../../src/math/gamma';
import { normalCdf } from '../../src/math/normal';
import { integrate } from '../../src/math/numericalIntegration';
import { findRoot } from '../../src/math/rootFinding';

describe('findRoot', () => {
  it('finds roots to machine precision', () => {
    expect(findRoot((x) => x * x - 2, 0, 2)).toBeCloseTo(Math.SQRT2, 15);
    expect(findRoot((x) => Math.cos(x) - x, 0, 1)).toBeCloseTo(0.7390851332151607, 15);
    expect(findRoot(Math.log, 1e-6, 50)).toBeCloseTo(1, 15);
  });

  it('handles a flat function with a root at a high power', () => {
    expect(findRoot((x) => (x - 1) ** 9, 0, 3)).toBeCloseTo(1, 10);
  });

  it('returns an endpoint that is already a root', () => {
    expect(findRoot((x) => x, 0, 1)).toBe(0);
    expect(findRoot((x) => x - 1, 0, 1)).toBe(1);
  });

  it('rejects intervals without a sign change and non-finite bounds', () => {
    expect(() => findRoot((x) => x * x + 1, -1, 1)).toThrow(RangeError);
    expect(() => findRoot((x) => x, -1, Infinity)).toThrow(RangeError);
  });
});

describe('integrate', () => {
  it('integrates smooth functions', () => {
    expect(integrate((x) => x ** 3, 0, 2)).toBeCloseTo(4, 12);
    expect(integrate(Math.sin, 0, Math.PI)).toBeCloseTo(2, 10);
    expect(integrate(Math.exp, 1, 0)).toBeCloseTo(1 - Math.E, 10);
    expect(integrate(Math.exp, 1, 1)).toBe(0);
  });

  it('agrees with the normal CDF', () => {
    const pdf = (x: number) => Math.exp((-x * x) / 2) / Math.sqrt(2 * Math.PI);
    expect(integrate(pdf, -1, 2.5)).toBeCloseTo(normalCdf(2.5) - normalCdf(-1), 10);
  });

  it('agrees with the incomplete gamma function', () => {
    const a = 3.7;
    const pdf = (t: number) => Math.exp((a - 1) * Math.log(t) - t - logGamma(a));
    expect(integrate(pdf, 1, 6)).toBeCloseTo(
      regularizedGammaP(a, 6) - regularizedGammaP(a, 1),
      10,
    );
  });

  it('throws instead of returning a wrong value', () => {
    expect(() => integrate((x) => 1 / x, 0, 1)).toThrow(RangeError);
    expect(() => integrate((x) => x, 0, Infinity)).toThrow(RangeError);
  });
});

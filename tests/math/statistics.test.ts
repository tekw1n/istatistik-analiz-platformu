import { describe as suite, expect, it } from 'vitest';
import { describe } from '../../src/math/statistics';

suite('descriptive statistics', () => {
  // Hand computed: sum = 40, squared deviations = 32, cubed deviations = 42.
  const data = [2, 4, 4, 4, 5, 5, 7, 9];

  it('matches hand computed values', () => {
    const s = describe(data);
    expect(s.n).toBe(8);
    expect(s.mean).toBe(5);
    expect(s.momentVariance).toBe(4);
    expect(s.sampleVariance).toBeCloseTo(32 / 7, 14);
    expect(s.sampleStdDev).toBeCloseTo(Math.sqrt(32 / 7), 14);
    expect(s.min).toBe(2);
    expect(s.max).toBe(9);
    expect(s.skewness).toBeCloseTo(42 / 8 / 8, 14);
    expect(s.coefficientOfVariation).toBeCloseTo(Math.sqrt(32 / 7) / 5, 14);
    expect(s.varianceToMeanRatio).toBeCloseTo(32 / 35, 14);
  });

  it('gives the same result for a frequency table', () => {
    expect(describe([2, 4, 5, 7, 9, 100], [1, 3, 2, 1, 1, 0])).toEqual(describe(data));
  });

  it('stays accurate for a large offset', () => {
    const s = describe(data.map((x) => x + 1e9));
    expect(s.momentVariance).toBeCloseTo(4, 6);
    expect(s.skewness).toBeCloseTo(0.65625, 6);
  });

  it('reports undefined statistics as null for a single observation', () => {
    const s = describe([3]);
    expect(s.momentVariance).toBe(0);
    expect(s.sampleVariance).toBeNull();
    expect(s.sampleStdDev).toBeNull();
    expect(s.skewness).toBeNull();
    expect(s.coefficientOfVariation).toBeNull();
    expect(s.varianceToMeanRatio).toBeNull();
  });

  it('treats constant data exactly', () => {
    const s = describe([0.1, 0.1, 0.1]);
    expect(s.mean).toBe(0.1);
    expect(s.sampleVariance).toBe(0);
    expect(s.skewness).toBeNull();
  });

  it('leaves ratios undefined when the mean is not positive', () => {
    const s = describe([-1, 0, 1]);
    expect(s.coefficientOfVariation).toBeNull();
    expect(s.varianceToMeanRatio).toBeNull();
    expect(s.skewness).toBe(0);
  });

  it.each([
    ['no data', () => describe([])],
    ['all frequencies zero', () => describe([1, 2], [0, 0])],
    ['non-finite value', () => describe([1, NaN])],
    ['negative frequency', () => describe([1], [-1])],
    ['fractional frequency', () => describe([1], [1.5])],
    ['length mismatch', () => describe([1, 2], [1])],
  ])('rejects %s', (_name, call) => {
    expect(call).toThrow(RangeError);
  });
});

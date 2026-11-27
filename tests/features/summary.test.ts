import { describe, expect, it } from 'vitest';
import type { Dataset } from '../../src/features/data-entry/types';
import { distributionHints, summarize } from '../../src/features/preliminary-analysis/summary';

const values = (
  list: number[],
  frequencies?: number[],
  source: Dataset['source'] = 'frequency',
): Dataset => ({ source, observations: { type: 'values', values: list, frequencies }, classes: null });

const grouped = (bounds: number[], frequencies: number[]): Dataset => {
  const observations = {
    type: 'classes' as const,
    classes: frequencies.map((frequency, i) => ({
      lower: bounds[i]!,
      upper: bounds[i + 1]!,
      frequency,
    })),
  };
  return { source: 'grouped', observations, classes: observations };
};

const hints = (d: Dataset) => distributionHints(d, summarize(d)).join(' ');

describe('summary', () => {
  it('is exact for a frequency table', () => {
    const s = summarize(values([0, 1, 2], [1, 2, 1]));
    expect(s.ok && [s.approximate, s.statistics.n, s.statistics.mean]).toEqual([false, 4, 1]);
  });

  it('uses midpoints for classes and marks the result approximate', () => {
    const s = summarize(grouped([0, 2, 4], [1, 1]));
    expect(s.ok && [s.approximate, s.statistics.mean]).toEqual([true, 2]);
  });

  it('gives only N with an open class or an open tail', () => {
    expect(summarize(grouped([-Infinity, 2, 4], [3, 4]))).toMatchObject({ ok: false, n: 7 });
    const tail: Dataset = values([0], [3]);
    tail.observations = { type: 'values', values: [0], frequencies: [3], openTail: { from: 1, frequency: 2 } };
    expect(summarize(tail)).toMatchObject({ ok: false, n: 5 });
  });
});

describe('hints', () => {
  it('suggests by the variance to mean ratio for counts', () => {
    expect(hints(values([0, 1, 2, 3, 4], [109, 65, 22, 3, 1]))).toContain('Poisson');
    expect(hints(values([4, 5, 6], [10, 30, 10]))).toContain('Binom');
    expect(hints(values([0, 20], [50, 50]))).toContain('aşırı yayılım');
  });

  it('recognises 0/1 data', () => {
    expect(hints(values([0, 1], [3, 4]))).toContain('Bernoulli');
  });

  it('suggests by the shape for continuous data', () => {
    expect(hints(grouped([0, 1, 2, 3], [1, 5, 1]))).toContain('Normal');
    expect(hints(grouped([0, 1, 2, 3, 4, 5], [50, 25, 12, 6, 3]))).toContain('sağa çarpık');
    expect(hints(values([1.5, 2.5, 3.5], undefined, 'raw'))).toContain('Normal');
  });
});

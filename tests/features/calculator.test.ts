import katex from 'katex';
import { describe, expect, it } from 'vitest';
import { exponential } from '../../src/distributions/continuous/exponential';
import { normal } from '../../src/distributions/continuous/normal';
import { binomial } from '../../src/distributions/discrete/binomial';
import type { Distribution } from '../../src/distributions/distributionTypes';
import { calculate, type Query } from '../../src/features/probability-calculator/calculate';

const coin = binomial(4, 0.5);

describe('discrete', () => {
  it.each<[string, Query, number]>([
    ['P(X = 2)', { type: 'point', a: 2 }, 6 / 16],
    ['P(X ≤ 1)', { type: 'atMost', a: 1 }, 5 / 16],
    ['P(X ≤ 1,5)', { type: 'atMost', a: 1.5 }, 5 / 16],
    ['P(1 ≤ X ≤ 3)', { type: 'between', a: 1, b: 3 }, 14 / 16],
    ['P(X = 1,5)', { type: 'point', a: 1.5 }, 0],
    ['no integer inside', { type: 'between', a: 1.2, b: 1.8 }, 0],
  ])('%s', (_name, query, expected) => {
    expect(calculate(coin, query).probability).toBeCloseTo(expected, 14);
  });

  it('says that both ends are included', () => {
    expect(calculate(coin, { type: 'between', a: 1, b: 3 }).notes.join(' ')).toContain('dahildir');
  });
});

describe('continuous', () => {
  it('gives a single point probability 0 and explains why', () => {
    const answer = calculate(normal(0, 1), { type: 'point', a: 0 });
    expect(answer.probability).toBe(0);
    expect(answer.notes[0]).toContain('P(X = a) = 0');
    expect(answer.notes[1]).toContain('0,398942');
    expect(answer.notes[1]).toContain('olasılık yoğunluğudur');
  });

  it('uses the CDF', () => {
    const d = exponential(0.5);
    expect(calculate(d, { type: 'atMost', a: 2 }).probability).toBeCloseTo(1 - Math.exp(-1), 15);
    expect(calculate(d, { type: 'between', a: 2, b: 4 }).probability).toBeCloseTo(
      Math.exp(-1) - Math.exp(-2),
      15,
    );
  });
});

describe('input and formulas', () => {
  it('rejects reversed bounds', () => {
    expect(() => calculate(coin, { type: 'between', a: 3, b: 1 })).toThrow('Alt sınır');
  });

  it('writes valid LaTeX', () => {
    const queries: Query[] = [
      { type: 'point', a: 1.5 },
      { type: 'atMost', a: -2e-7 },
      { type: 'between', a: 1, b: 1234.5 },
      { type: 'between', a: 1.2, b: 1.8 },
    ];
    for (const d of [coin, normal(0, 1)] as Distribution[]) {
      for (const query of queries) {
        const { formula } = calculate(d, query);
        expect(() =>
          katex.renderToString(formula, { throwOnError: true, strict: 'error' }),
        ).not.toThrow();
      }
    }
  });
});

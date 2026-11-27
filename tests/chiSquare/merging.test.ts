import { describe, expect, it } from 'vitest';
import { mergeClasses } from '../../src/chiSquare/merging';
import type { ChiSquareClass } from '../../src/chiSquare/types';

/** Classes k = 0, 1, 2, ... with the given expected frequencies; O = index + 1. */
function build(expected: number[]): ChiSquareClass[] {
  const total = expected.reduce((a, b) => a + b, 0);
  return expected.map((e, i) => ({
    lower: i,
    upper: i,
    observed: i + 1,
    probability: e / total,
    expected: e,
  }));
}

const ranges = (classes: ChiSquareClass[]) => classes.map((c) => [c.lower, c.upper]);

describe('mergeClasses', () => {
  it('leaves classes with E >= 5 untouched', () => {
    const result = mergeClasses(build([5, 8, 5]));
    expect(result.history).toEqual([]);
    expect(result.classes).toHaveLength(3);
  });

  it('merges both tails inwards, lower tail first', () => {
    const { classes, history } = mergeClasses(build([1, 2, 4, 10, 6, 3, 1]));
    expect(ranges(classes)).toEqual([[0, 2], [3, 3], [4, 6]]);
    expect(classes.map((c) => c.expected)).toEqual([7, 10, 10]);
    expect(history.map((h) => h.rule)).toEqual([
      'lower-tail',
      'lower-tail',
      'upper-tail',
      'upper-tail',
    ]);
  });

  it('merges an interior class with the smaller neighbour', () => {
    const right = mergeClasses(build([10, 3, 7, 12]));
    expect(ranges(right.classes)).toEqual([[0, 0], [1, 2], [3, 3]]);
    expect(right.history[0]!.rule).toBe('interior');

    const left = mergeClasses(build([7, 3, 10, 12]));
    expect(ranges(left.classes)).toEqual([[0, 1], [2, 2], [3, 3]]);
  });

  it('chooses the left neighbour on a tie, also a tie up to rounding', () => {
    for (const rightE of [8, 8 - 1e-12]) {
      const { classes } = mergeClasses(build([8, 2, rightE]));
      expect(ranges(classes)).toEqual([[0, 1], [2, 2]]);
    }
  });

  it('starts with the leftmost small interior class', () => {
    const { history } = mergeClasses(build([9, 4, 9, 1, 9]));
    expect(history.map((h) => h.result.lower)).toEqual([0, 2]);
  });

  it('treats E = 5 up to rounding as large enough', () => {
    expect(mergeClasses(build([5 - 1e-12, 5])).history).toEqual([]);
    expect(mergeClasses(build([4.999, 5])).history).toHaveLength(1);
  });

  it('stops at one class', () => {
    const { classes, history } = mergeClasses(build([0.5, 1, 1.5]));
    expect(classes).toHaveLength(1);
    expect(history).toHaveLength(2);
    expect(mergeClasses(build([1])).history).toEqual([]);
  });

  it('preserves the totals of O, E and p and records every step', () => {
    const input = build([0.2, 6, 1, 1, 30, 4, 0.1, 9, 0]);
    const { classes, history } = mergeClasses(input);
    for (const key of ['observed', 'expected', 'probability'] as const) {
      const sum = (rows: ChiSquareClass[]) => rows.reduce((s, c) => s + c[key], 0);
      expect(sum(classes)).toBeCloseTo(sum(input), 12);
    }
    expect(history).toHaveLength(input.length - classes.length);
    for (const { merged, result } of history) {
      expect(merged[0].upper + 1).toBe(merged[1].lower);
      expect(result.expected).toBe(merged[0].expected + merged[1].expected);
    }
    expect(classes.every((c) => c.expected >= 5)).toBe(true);
    expect(input).toHaveLength(9);
  });
});

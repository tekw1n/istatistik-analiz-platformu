import { describe, expect, it } from 'vitest';
import { classify, sturgesClassCount } from '../../src/features/data-entry/sturges';
import {
  fillMissingCategories,
  pasteClassRows,
  pasteFrequencyRows,
  readClassTable,
  readFrequencyTable,
  sortRows,
} from '../../src/features/data-entry/tables';

const rows = (...pairs: [string, string][]) => pairs.map(([x, f]) => ({ x, f }));
const classRows = (...triples: [string, string, string][]) =>
  triples.map(([lower, upper, f]) => ({ lower, upper, f }));

describe('frequency table', () => {
  it('builds observations and N, ignoring blank rows', () => {
    const r = readFrequencyTable(rows(['0', '3'], ['', ''], ['1', '5']), false);
    expect(r.total).toBe(8);
    expect(r.observations).toEqual({ type: 'values', values: [0, 1], frequencies: [3, 5] });
  });

  it('turns the open last row into X >= x', () => {
    const r = readFrequencyTable(rows(['0', '3'], ['1', '5'], ['2', '4']), true);
    expect(r.total).toBe(12);
    expect(r.observations).toEqual({
      type: 'values',
      values: [0, 1],
      frequencies: [3, 5],
      openTail: { from: 2, frequency: 4 },
    });
  });

  it.each<[string, [string, string][], number, string]>([
    ['non-integer x', [['1,5', '2']], 0, 'x'],
    ['missing x', [['', '2']], 0, 'x'],
    ['negative frequency', [['1', '-2']], 0, 'f'],
    ['fractional frequency', [['1', '2.5']], 0, 'f'],
    ['missing frequency', [['1', '']], 0, 'f'],
    ['duplicate x', [['1', '2'], ['1', '3']], 1, 'x'],
    ['unsorted x', [['2', '2'], ['1', '3']], 1, 'x'],
  ])('reports %s on the right cell', (_name, pairs, row, field) => {
    const r = readFrequencyTable(rows(...pairs), false);
    expect(r.errors).toEqual([expect.objectContaining({ row, field })]);
    expect(r.observations).toBeNull();
  });

  it('requires data and a positive total', () => {
    expect(readFrequencyTable(rows(['', '']), false).observations).toBeNull();
    expect(readFrequencyTable(rows(['1', '0']), false).problems).toHaveLength(1);
  });

  it('warns about missing categories and fills them with zero', () => {
    const input = rows(['3', '1'], ['0', '2']);
    expect(readFrequencyTable(rows(['0', '2'], ['3', '1']), false).warnings).toHaveLength(1);
    expect(fillMissingCategories(input)).toEqual(
      rows(['0', '2'], ['1', '0'], ['2', '0'], ['3', '1']),
    );
  });

  it('sorts without adding rows', () => {
    expect(sortRows(rows(['3', '1'], ['', ''], ['0', '2']))).toEqual(
      rows(['0', '2'], ['3', '1']),
    );
  });

  it('keeps unreadable rows when sorting', () => {
    expect(fillMissingCategories(rows(['x', '4'], ['1', '2']))).toEqual(
      rows(['1', '2'], ['x', '4']),
    );
  });
});

describe('grouped table', () => {
  it('accepts adjacent classes with open ends', () => {
    const r = readClassTable(
      classRows(['', '10', '3'], ['10', '12,5', '4'], ['12.5', '', '5']),
      true,
      true,
    );
    expect(r.total).toBe(12);
    expect(r.observations!.classes).toEqual([
      { lower: -Infinity, upper: 10, frequency: 3 },
      { lower: 10, upper: 12.5, frequency: 4 },
      { lower: 12.5, upper: Infinity, frequency: 5 },
    ]);
  });

  it.each<[string, [string, string, string][], string]>([
    ['a gap', [['10', '19', '1'], ['20', '29', '1']], 'boşluk'],
    ['an overlap', [['10', '20', '1'], ['15', '25', '1']], 'çakışıyor'],
    ['a negative width', [['20', '10', '1'], ['10', '30', '1']], 'büyük olmalıdır'],
    ['zero width', [['10', '10', '1'], ['10', '30', '1']], 'büyük olmalıdır'],
    ['a text bound', [['a', '10', '1'], ['10', '30', '1']], 'sayı olmalıdır'],
    ['a negative frequency', [['0', '10', '-1'], ['10', '30', '1']], 'tam sayı'],
  ])('reports %s', (_name, triples, text) => {
    const r = readClassTable(classRows(...triples), false, false);
    expect(r.errors.map((e) => e.message).join(' ')).toContain(text);
    expect(r.observations).toBeNull();
  });

  it('requires two classes and a positive total', () => {
    expect(readClassTable(classRows(['0', '1', '5']), false, false).observations).toBeNull();
    expect(
      readClassTable(classRows(['0', '1', '0'], ['1', '2', '0']), false, false).observations,
    ).toBeNull();
  });
});

describe('spreadsheet paste', () => {
  it('reads two columns and skips the header', () => {
    expect(pasteFrequencyRows('x\tf\n0\t109\n1\t65\n')).toEqual({
      rows: rows(['0', '109'], ['1', '65']),
    });
  });

  it('rejects the wrong number of columns', () => {
    expect(pasteFrequencyRows('1\t2\t3\n4\t5\t6')).toHaveProperty('error');
    expect(pasteClassRows('1\t2\n3\t4')).toHaveProperty('error');
  });

  it('drops a midpoint column and detects open ends', () => {
    expect(pasteClassRows('\t10\t\t4\n10\t20\t15\t6\n20\t∞\t\t2')).toEqual({
      rows: classRows(['', '10', '4'], ['10', '20', '6'], ['20', '', '2']),
      openFirst: true,
      openLast: true,
    });
  });

  it('keeps decimal commas', () => {
    expect(pasteClassRows('0\t2,5\t4\n2,5\t5\t6')).toMatchObject({
      rows: classRows(['0', '2,5', '4'], ['2,5', '5', '6']),
      openFirst: false,
    });
  });
});

describe('Sturges classification', () => {
  it.each([
    [1, 1],
    [10, 5],
    [100, 8],
    [1000, 11],
  ])('N = %s gives k = %s', (n, k) => {
    expect(sturgesClassCount(n)).toBe(k);
  });

  const sum = (r: ReturnType<typeof classify>) =>
    r.ok ? r.classes.reduce((s, c) => s + c.frequency, 0) : 0;

  it('covers all integer data and counts boundary values in the upper class', () => {
    const r = classify([0, 2, 3, 4, 10, 6], 4);
    expect(r).toMatchObject({ ok: true, width: 3 });
    if (!r.ok) return;
    expect(r.classes.map((c) => [c.lower, c.upper, c.frequency])).toEqual([
      [0, 3, 2],
      [3, 6, 2],
      [6, 9, 1],
      [9, 12, 1],
    ]);
  });

  it('includes the maximum in the last class', () => {
    const r = classify([0, 5, 10], 2);
    expect(r.ok && r.classes.map((c) => c.frequency)).toEqual([1, 2]);
  });

  it('has exact decimal bounds and counts by those bounds', () => {
    const data = [0.1, 0.2, 0.3, 0.4, 0.7];
    const r = classify(data, 3);
    if (!r.ok) throw new Error(r.reason);
    expect(r.width).toBe(0.2);
    expect(r.classes.map((c) => c.lower)).toEqual([0.1, 0.3, 0.5]);
    expect(r.classes.map((c) => c.frequency)).toEqual([2, 2, 1]);
  });

  it('makes fewer classes when the measurements are too coarse', () => {
    const r = classify([1, 2, 3, 4], 10);
    expect(r.ok && r.classes).toHaveLength(3);
    expect(sum(r)).toBe(4);
  });

  it('covers every observation for many data sets', () => {
    let seed = 3;
    const random = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
    for (let trial = 0; trial < 300; trial++) {
      const decimals = trial % 9;
      const scale = 10 ** ((trial % 7) - 3);
      const data = Array.from({ length: 2 + (trial % 60) }, () =>
        Number(((random() - 0.3) * 1000 * scale).toFixed(decimals)),
      );
      const r = classify(data, 2 + (trial % 12));
      if (!r.ok) continue;
      expect(sum(r)).toBe(data.length);
      expect(r.classes[0]!.lower).toBeLessThanOrEqual(Math.min(...data));
      expect(r.classes.at(-1)!.upper).toBeGreaterThanOrEqual(Math.max(...data));
      r.classes.forEach((c, i) => {
        expect(c.upper).toBeGreaterThan(c.lower);
        if (i) expect(c.lower).toBe(r.classes[i - 1]!.upper);
      });
    }
  });

  it.each<[string, number[], number]>([
    ['a single observation', [5], 3],
    ['constant data', [2, 2, 2], 3],
    ['k = 1', [1, 2, 3], 1],
    ['a fractional k', [1, 2, 3], 2.5],
    ['a range of one measuring unit', [1, 2], 3],
  ])('refuses %s', (_name, data, k) => {
    expect(classify(data, k).ok).toBe(false);
  });
});

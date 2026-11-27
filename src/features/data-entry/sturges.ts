import type { DataClass } from '../../distributions/estimation/types';

export const MAX_CLASS_COUNT = 100;
const MAX_DECIMALS = 6;

/** k = ⌈1 + 3.322 · log10 N⌉ */
export function sturgesClassCount(n: number): number {
  return Math.ceil(1 + 3.322 * Math.log10(n));
}

function decimalsOf(value: number): number {
  for (let d = 0; d <= MAX_DECIMALS; d++) {
    if (Number(value.toFixed(d)) === value) return d;
  }
  return MAX_DECIMALS + 1;
}

export type Classification =
  | { ok: true; classes: DataClass[]; width: number }
  | { ok: false; reason: string };

/**
 * Equal width classes [a, b) from the minimum up; the last class also includes its upper bound.
 * The width is range / k rounded up to the precision of the data, so there can be fewer
 * than k classes when k is large compared with the number of distinct measurable values.
 */
export function classify(values: readonly number[], k: number): Classification {
  if (!Number.isInteger(k) || k < 2 || k > MAX_CLASS_COUNT) {
    return { ok: false, reason: `Sınıf sayısı 2 ile ${MAX_CLASS_COUNT} arasında tam sayı olmalıdır.` };
  }
  const min = values.reduce((a, b) => Math.min(a, b), Infinity);
  const max = values.reduce((a, b) => Math.max(a, b), -Infinity);
  if (!(max > min)) {
    return {
      ok: false,
      reason:
        values.length < 2
          ? 'Tek gözlemle sürekli sınıflandırma yapılamaz.'
          : 'Tüm gözlemler aynı olduğundan sürekli sınıflandırma yapılamaz.',
    };
  }

  const decimals = values.reduce((d, v) => Math.max(d, decimalsOf(v)), 0);
  const rounded = decimals <= MAX_DECIMALS;
  const unit = 10 ** -decimals;
  const range = max - min;
  // The small subtraction keeps 3.0000000000000004 from being rounded up to 4.
  const width = rounded ? Math.ceil(range / k / unit - 1e-9) * unit : range / k;
  const count = rounded ? Math.ceil(range / width - 1e-9) : k;
  if (count < 2) {
    return { ok: false, reason: 'Veri aralığı ölçüm hassasiyetine göre iki sınıf oluşturamayacak kadar dar.' };
  }
  const edge = (i: number) => {
    const x = min + i * width;
    return rounded ? Number(x.toFixed(decimals)) : x;
  };

  const classes: DataClass[] = Array.from({ length: count }, (_, i) => ({
    lower: edge(i),
    upper: i === count - 1 ? Math.max(edge(count), max) : edge(i + 1),
    frequency: 0,
  }));

  // Counting compares with the very bounds that are displayed.
  for (const value of values) {
    let low = 0;
    let high = count - 1;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (value >= classes[mid]!.lower) low = mid;
      else high = mid - 1;
    }
    classes[low]!.frequency++;
  }

  return { ok: true, classes, width: rounded ? Number(width.toFixed(decimals)) : width };
}

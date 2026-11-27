import { describe, type DescriptiveStatistics } from '../../math/statistics';
import type { Dataset } from '../data-entry/types';

export type Summary =
  | {
      ok: true;
      statistics: DescriptiveStatistics;
      /** Computed from class midpoints. */
      approximate: boolean;
    }
  | { ok: false; n: number; reason: string };

/** Descriptive statistics of the entered data, where they are defined. */
export function summarize({ observations }: Dataset): Summary {
  if (observations.type === 'classes') {
    const { classes } = observations;
    const frequencies = classes.map((c) => c.frequency);
    if (classes.some((c) => !Number.isFinite(c.lower) || !Number.isFinite(c.upper))) {
      return {
        ok: false,
        n: frequencies.reduce((a, b) => a + b, 0),
        reason: 'Açık uçlu sınıfın orta noktası tanımsız olduğundan özet istatistikler hesaplanamaz.',
      };
    }
    const midpoints = classes.map((c) => (c.lower + c.upper) / 2);
    return { ok: true, statistics: describe(midpoints, frequencies), approximate: true };
  }
  const { values, frequencies, openTail } = observations;
  if (openTail && openTail.frequency > 0) {
    const listed = frequencies ? frequencies.reduce((a, b) => a + b, 0) : values.length;
    return {
      ok: false,
      n: listed + openTail.frequency,
      reason: 'Açık uçlu sınıftaki gözlem değerleri bilinmediğinden özet istatistikler hesaplanamaz.',
    };
  }
  return { ok: true, statistics: describe(values, frequencies), approximate: false };
}

/** Whether every observed value is an integer (false for grouped data). */
function integerValues({ observations }: Dataset): number[] | null {
  if (observations.type !== 'values') return null;
  const { values, frequencies } = observations;
  const observed = values.filter((_, i) => !frequencies || frequencies[i]! > 0);
  return observed.every(Number.isInteger) ? observed : null;
}

/**
 * Heuristic suggestions from the shape of the data. They are hints to look at a distribution,
 * never a judgement that it fits.
 */
export function distributionHints(dataset: Dataset, summary: Summary): string[] {
  if (!summary.ok) return [];
  const { skewness, coefficientOfVariation: cv, varianceToMeanRatio: ratio, min } =
    summary.statistics;
  const hints: string[] = [];
  const integers = integerValues(dataset);

  if (integers && min >= 0) {
    if (integers.every((v) => v === 0 || v === 1)) {
      return ['Veri yalnızca 0 ve 1 içeriyor: Bernoulli dağılımı tanım gereği uygundur.'];
    }
    if (ratio !== null) {
      if (ratio >= 0.8 && ratio <= 1.2) {
        hints.push('Varyans / ortalama 1’e yakın: Poisson dağılımı incelenebilir.');
      } else if (ratio < 0.8) {
        hints.push(
          'Varyans ortalamadan küçük: Binom (deneme sayısı biliniyorsa) veya Kesikli Düzgün incelenebilir.',
        );
      } else {
        hints.push(
          'Varyans ortalamadan büyük (aşırı yayılım): Geometrik veya Kesikli Düzgün incelenebilir.',
        );
      }
    }
  }

  if (dataset.source !== 'frequency' && !(dataset.source === 'raw' && integers && min >= 0)) {
    if (skewness !== null && Math.abs(skewness) < 0.5) {
      hints.push('Çarpıklık 0’a yakın: Normal veya Sürekli Düzgün dağılım incelenebilir.');
    } else if (skewness !== null && skewness > 0.5 && min > 0) {
      hints.push('Veri sağa çarpık ve pozitif: Üstel, Gamma veya Log-Normal incelenebilir.');
    }
    if (cv !== null && cv >= 0.8 && cv <= 1.2 && min >= 0) {
      hints.push('Varyasyon katsayısı 1’e yakın: Üstel dağılım incelenebilir.');
    }
  }
  return hints;
}

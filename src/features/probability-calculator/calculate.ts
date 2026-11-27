import { quantile, visibleRange } from '../../components/charts/chartData';
import { intervalProbability, isInSupport } from '../../distributions/createDistribution';
import type { Distribution } from '../../distributions/distributionTypes';
import { formatNumber, texNumber } from '../../utils/format';

export type Query =
  | { type: 'point'; a: number }
  | { type: 'atMost'; a: number }
  | { type: 'between'; a: number; b: number };

/** What the user chose in the calculator. A bound that is absent shows its default. */
export interface CalculatorInput {
  type: Query['type'];
  a?: string;
  b?: string;
}

/**
 * Starting bounds that show a visible area at once: a is the rounded mean and
 * b a rounded value about one standard deviation above it.
 */
export function defaultBounds(distribution: Distribution, mean: number): { a: number; b: number } {
  let step = 1;
  if (distribution.kind === 'continuous') {
    const [lo, hi] = visibleRange(distribution);
    step = 10 ** Math.floor(Math.log10((hi - lo) / 20));
  }
  // toPrecision removes the binary noise of the multiplication.
  const round = (x: number) => Number((Math.round(x / step) * step).toPrecision(12));
  const a = round(mean);
  const upper = round(quantile(distribution, 0.84));
  return { a, b: upper > a ? upper : Number((a + step).toPrecision(12)) };
}

export interface Answer {
  probability: number;
  /** LaTeX of the calculation. */
  formula: string;
  notes: string[];
  /** The values of X the probability covers, for the chart. */
  region: [number, number];
}

/** P(X = a), P(X <= a) or P(a <= X <= b). */
export function calculate(distribution: Distribution, query: Query): Answer {
  const discrete = distribution.kind === 'discrete';
  const { a } = query;

  if (query.type === 'point') {
    if (!discrete) {
      const density = distribution.pdf(a);
      return {
        probability: 0,
        formula: `P(X=${texNumber(a)})=\\int_{${texNumber(a)}}^{${texNumber(a)}}f(x)\\,dx=0`,
        notes: [
          'Sürekli dağılımlarda tek bir noktanın olasılığı sıfırdır: P(X = a) = 0.',
          `f(${formatNumber(a)}) = ${formatNumber(density)} bir olasılık değil, olasılık yoğunluğudur.`,
        ],
        region: [a, a],
      };
    }
    const probability = distribution.pmf(a);
    return {
      probability,
      formula: `P(X=${texNumber(a)})=${texNumber(probability)}`,
      notes: isInSupport(distribution.support, a)
        ? []
        : [`${formatNumber(a)} dağılımın destek kümesinde değildir; olasılığı 0’dır.`],
      region: [a, a],
    };
  }

  if (query.type === 'atMost') {
    const probability = distribution.cdf(a);
    return {
      probability,
      formula: `P(X\\le ${texNumber(a)})=F(${texNumber(a)})=${texNumber(probability)}`,
      notes:
        discrete && !Number.isInteger(a)
          ? [`X tam sayı olduğundan P(X ≤ ${formatNumber(a)}) = P(X ≤ ${formatNumber(Math.floor(a))}).`]
          : [],
      region: [-Infinity, a],
    };
  }

  const { b } = query;
  // Throws a Turkish RangeError when a > b.
  const probability = intervalProbability(distribution, a, b);
  const bounds = `P(${texNumber(a)}\\le X\\le ${texNumber(b)})`;
  const difference = discrete
    ? `F(${texNumber(Math.floor(b))})-F(${texNumber(Math.ceil(a) - 1)})`
    : `F(${texNumber(b)})-F(${texNumber(a)})`;
  // No integer in the interval: there is nothing to subtract.
  const empty = discrete && Math.ceil(a) > Math.floor(b);
  return {
    probability,
    formula: empty ? `${bounds}=0` : `${bounds}=${difference}=${texNumber(probability)}`,
    notes: discrete
      ? [empty ? 'Aralıkta tam sayı bulunmadığından olasılık 0’dır.' : 'Kesikli dağılımda her iki uç değer olasılığa dahildir.']
      : ['Sürekli dağılımda uç noktaların dahil edilip edilmemesi olasılığı değiştirmez.'],
    region: [a, b],
  };
}

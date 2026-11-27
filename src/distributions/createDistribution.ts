import type {
  ContinuousDistribution,
  DiscreteDistribution,
  Distribution,
  Support,
} from './distributionTypes';

export function isInSupport(support: Support, x: number): boolean {
  return (
    Number.isFinite(x) &&
    (!support.integer || Number.isInteger(x)) &&
    (support.minExclusive ? x > support.min : x >= support.min) &&
    x <= support.max
  );
}

/** Parameter validation. The message is shown to the user, so it is Turkish. */
export function requireParameter(condition: boolean, message: string): void {
  if (!condition) throw new RangeError(message);
}

function requireNumber(x: number): void {
  if (Number.isNaN(x)) throw new RangeError('Değer sayı olmalıdır.');
}

/** Formulas that only need to be valid inside the support. */
interface Formulas {
  support: Support;
  density(x: number): number;
  cdf(x: number): number;
  sf(x: number): number;
}

export function discreteDistribution({ support, density, cdf, sf }: Formulas): DiscreteDistribution {
  // P(X <= x) = P(X <= floor(x)); outside [min, max) the tails are exactly 0 or 1.
  const tail = (x: number, below: number, above: number, inside: (k: number) => number) => {
    requireNumber(x);
    const k = Math.floor(x);
    if (k < support.min) return below;
    return k >= support.max ? above : inside(k);
  };
  return {
    kind: 'discrete',
    support,
    pmf: (x) => {
      requireNumber(x);
      return isInSupport(support, x) ? density(x) : 0;
    },
    cdf: (x) => tail(x, 0, 1, cdf),
    sf: (x) => tail(x, 1, 0, sf),
  };
}

export function continuousDistribution({
  support,
  density,
  cdf,
  sf,
}: Formulas): ContinuousDistribution {
  const tail = (x: number, below: number, above: number, inside: (v: number) => number) => {
    requireNumber(x);
    if (x === -Infinity || x < support.min) return below;
    return x === Infinity || x >= support.max ? above : inside(x);
  };
  return {
    kind: 'continuous',
    support,
    pdf: (x) => {
      requireNumber(x);
      return isInSupport(support, x) ? density(x) : 0;
    },
    cdf: (x) => tail(x, 0, 1, cdf),
    sf: (x) => tail(x, 1, 0, sf),
  };
}

/**
 * P(a <= X <= b). Either bound may be infinite (open-ended class).
 * The tail on the far side of the median is subtracted, which avoids cancellation near 1.
 */
export function intervalProbability(distribution: Distribution, a: number, b: number): number {
  requireNumber(a);
  requireNumber(b);
  if (a > b) throw new RangeError('Alt sınır üst sınırdan büyük olamaz.');

  let below = a;
  if (distribution.kind === 'discrete') {
    const first = Math.ceil(a);
    const last = Math.floor(b);
    if (first > last) return 0;
    if (first === last) return distribution.pmf(first);
    below = first - 1;
  }

  const cdfBelow = distribution.cdf(below);
  const probability =
    cdfBelow > 0.5
      ? distribution.sf(below) - distribution.sf(b)
      : distribution.cdf(b) - cdfBelow;
  return Math.max(0, probability);
}

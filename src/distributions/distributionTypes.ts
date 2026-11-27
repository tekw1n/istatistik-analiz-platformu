/** The set of values a distribution can produce. Infinite bounds are never attained. */
export interface Support {
  min: number;
  max: number;
  /** Only integers belong to the support. */
  integer: boolean;
  /** `min` itself does not belong to the support. */
  minExclusive?: boolean;
}

interface BaseDistribution {
  support: Support;
  /** P(X <= x) */
  cdf(x: number): number;
  /** Survival function P(X > x), computed directly so the upper tail keeps its precision. */
  sf(x: number): number;
}

export interface DiscreteDistribution extends BaseDistribution {
  kind: 'discrete';
  /** P(X = x) */
  pmf(x: number): number;
}

export interface ContinuousDistribution extends BaseDistribution {
  kind: 'continuous';
  /** Density at x. This is not a probability: P(X = x) = 0. */
  pdf(x: number): number;
}

export type Distribution = DiscreteDistribution | ContinuousDistribution;

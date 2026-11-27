import { erfc } from './erf';

function standardize(x: number, mean: number, sd: number): number {
  if (!Number.isFinite(mean) || !(sd > 0) || !Number.isFinite(sd)) {
    throw new RangeError(`normal: needs finite mean and sd > 0, got mean = ${mean}, sd = ${sd}`);
  }
  return (x - mean) / sd;
}

/** P(X <= x) for X ~ N(mean, sd²). */
export function normalCdf(x: number, mean = 0, sd = 1): number {
  return 0.5 * erfc(-standardize(x, mean, sd) / Math.SQRT2);
}

/** Survival function P(X > x), computed directly so the upper tail keeps its precision. */
export function normalSf(x: number, mean = 0, sd = 1): number {
  return 0.5 * erfc(standardize(x, mean, sd) / Math.SQRT2);
}

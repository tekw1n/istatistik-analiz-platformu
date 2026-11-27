/** A statistic is null when it is undefined for the data. */
export interface DescriptiveStatistics {
  /** Number of observations N. */
  n: number;
  mean: number;
  /** s², divisor N - 1. Null when N = 1. */
  sampleVariance: number | null;
  /** s. Null when N = 1. */
  sampleStdDev: number | null;
  /** m2, divisor N. */
  momentVariance: number;
  min: number;
  max: number;
  /** g1 = m3 / m2^(3/2). Null for constant data. */
  skewness: number | null;
  /** s / mean. Null when N = 1 or mean <= 0. */
  coefficientOfVariation: number | null;
  /** s² / mean. Null when N = 1 or mean <= 0. */
  varianceToMeanRatio: number | null;
}

/**
 * Descriptive statistics of raw values, or of a frequency table when `frequencies` is given.
 * For grouped data pass class midpoints; the results are then approximations.
 */
export function describe(
  values: readonly number[],
  frequencies?: readonly number[],
): DescriptiveStatistics {
  if (frequencies && frequencies.length !== values.length) {
    throw new RangeError('describe: values and frequencies differ in length');
  }

  let n = 0;
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  values.forEach((value, i) => {
    const f = frequencies ? frequencies[i]! : 1;
    if (!Number.isFinite(value)) throw new RangeError(`describe: invalid value ${value}`);
    if (!Number.isInteger(f) || f < 0) throw new RangeError(`describe: invalid frequency ${f}`);
    if (f === 0) return;
    n += f;
    sum += f * value;
    min = Math.min(min, value);
    max = Math.max(max, value);
  });
  if (n === 0) throw new RangeError('describe: there are no observations');

  // Constant data is handled exactly, so rounding cannot invent a spread or a skewness.
  const constant = min === max;
  let mean = constant ? min : sum / n;
  let d1 = 0;
  let d2 = 0;
  let d3 = 0;
  if (!constant) {
    // Second pass corrects the rounding error of the first mean.
    let correction = 0;
    values.forEach((value, i) => {
      correction += (frequencies ? frequencies[i]! : 1) * (value - mean);
    });
    mean += correction / n;
    values.forEach((value, i) => {
      const f = frequencies ? frequencies[i]! : 1;
      const d = value - mean;
      d1 += f * d;
      d2 += f * d * d;
      d3 += f * d * d * d;
    });
    d2 -= (d1 * d1) / n;
  }

  const momentVariance = d2 / n;
  const sampleVariance = n > 1 ? d2 / (n - 1) : null;
  const sampleStdDev = sampleVariance === null ? null : Math.sqrt(sampleVariance);
  const ratioDefined = sampleVariance !== null && mean > 0;

  return {
    n,
    mean,
    sampleVariance,
    sampleStdDev,
    momentVariance,
    min,
    max,
    skewness: momentVariance > 0 ? d3 / n / momentVariance ** 1.5 : null,
    coefficientOfVariation: ratioDefined ? sampleStdDev! / mean : null,
    varianceToMeanRatio: ratioDefined ? sampleVariance / mean : null,
  };
}

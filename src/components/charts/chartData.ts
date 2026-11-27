import type {
  ContinuousDistribution,
  DiscreteDistribution,
  Distribution,
} from '../../distributions/distributionTypes';
import type { DataClass } from '../../distributions/estimation/types';

const SAMPLES = 240;
export const MAX_BARS = 300;
/** A finite discrete support this small is always drawn completely. */
const FULL_SUPPORT = 60;

/** Round tick values (steps of 1, 2, 2.5 or 5 times a power of ten) covering about `count` gaps. */
export function niceTicks(min: number, max: number, count = 8): number[] {
  const raw = (max - min) / count;
  if (!(raw > 0) || !Number.isFinite(raw)) return [min];
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= raw * (1 - 1e-9))!;
  const ticks: number[] = [];
  for (let i = Math.ceil(min / step - 1e-9); i * step <= max + step * 1e-9; i++) {
    // Removes the binary noise of i * step.
    ticks.push(Number((i * step).toPrecision(12)));
  }
  return ticks;
}

/** An axis from 0 to the first round value at or above `max`. */
export function niceAxis(max: number, count = 5): { top: number; ticks: number[] } {
  if (!(max > 0)) return { top: 1, ticks: [0, 1] };
  const ticks = niceTicks(0, max, count);
  const step = ticks[1] ?? max;
  while (ticks[ticks.length - 1]! < max * (1 - 1e-9)) {
    ticks.push(Number((ticks[ticks.length - 1]! + step).toPrecision(12)));
  }
  return { top: ticks[ticks.length - 1]!, ticks };
}

/** The x with P(X <= x) ≈ p, found by bisection. Only used to choose axis ranges. */
export function quantile(distribution: Distribution, p: number): number {
  let lower = -1;
  let upper = 1;
  while (distribution.cdf(lower) > p && lower > -1e300) lower *= 2;
  while (distribution.cdf(upper) < p && upper < 1e300) upper *= 2;
  for (let i = 0; i < 200; i++) {
    const mid = lower / 2 + upper / 2;
    if (distribution.cdf(mid) < p) lower = mid;
    else upper = mid;
  }
  return upper;
}

/** A range holding almost all of the probability. */
export function visibleRange(distribution: Distribution): [number, number] {
  const { min, max } = distribution.support;
  // A bounded density is shown with some room on both sides, so its jumps are visible.
  if (distribution.kind === 'continuous' && Number.isFinite(min) && Number.isFinite(max)) {
    const room = (max - min) * 0.05;
    return [min - room, max + room];
  }
  return [quantile(distribution, 0.001), quantile(distribution, 0.999)];
}

/** False when the parameters are beyond what the special functions can evaluate. */
export function canEvaluate(distribution: Distribution): boolean {
  try {
    visibleRange(distribution);
    return true;
  } catch {
    return false;
  }
}

/**
 * Evenly spaced points of [from, to] plus the given breakpoints, each with a neighbour just
 * below it, so that jumps of a density or a histogram are drawn vertically.
 */
function sampleAxis(from: number, to: number, breakpoints: readonly number[]): number[] {
  const width = to - from;
  const points = Array.from({ length: SAMPLES + 1 }, (_, i) => from + (width * i) / SAMPLES);
  for (const x of breakpoints) {
    if (x >= from && x <= to) points.push(x - width * 1e-9, x, x + width * 1e-9);
  }
  return [...new Set(points)].filter((x) => x >= from && x <= to).sort((a, b) => a - b);
}

export interface DensityPoint {
  x: number;
  /** Height of the data histogram f / (N · h); null outside the drawn classes. */
  observed: number | null;
  /** f(x) */
  model: number;
}

export interface DensityChartData {
  points: DensityPoint[];
  domain: [number, number];
  yMax: number;
  /** The density leaves the chart (it can be unbounded near 0). */
  clipped: boolean;
  /** Open classes with observations: they have no width, so no histogram bar. */
  omitted: DataClass[];
}

/** Density-scaled histogram of the classes together with the theoretical density. */
export function densityChart(
  distribution: ContinuousDistribution,
  classes: readonly DataClass[],
): DensityChartData {
  const total = classes.reduce((sum, c) => sum + c.frequency, 0);
  const closed = classes.filter((c) => Number.isFinite(c.lower) && Number.isFinite(c.upper));
  const bars = closed.map((c) => ({ ...c, height: c.frequency / (total * (c.upper - c.lower)) }));

  let [from, to] = visibleRange(distribution);
  if (bars.length) {
    const start = bars[0]!.lower;
    const end = bars[bars.length - 1]!.upper;
    const margin = (end - start) / 2;
    // The data are always shown; the curve may extend them by half their width on each side.
    // A bounded support is shown completely, however far it reaches.
    const { min: lowest, max: highest } = distribution.support;
    const bounded = Number.isFinite(lowest) && Number.isFinite(highest);
    from = bounded ? Math.min(from, start) : Math.max(Math.min(from, start), start - margin);
    to = bounded ? Math.max(to, end) : Math.min(Math.max(to, end), end + margin);
  }

  const { min, max } = distribution.support;
  const edges = bars.flatMap((b) => [b.lower, b.upper]);
  const points = sampleAxis(from, to, [...edges, min, max]).map((x) => {
    const last = bars[bars.length - 1];
    const bar =
      bars.find((b) => x >= b.lower && x < b.upper) ?? (x === last?.upper ? last : undefined);
    return { x, observed: bar ? bar.height : null, model: distribution.pdf(x) };
  });

  const tallestBar = bars.reduce((m, b) => Math.max(m, b.height), 0);
  const peak = points.reduce((m, p) => Math.max(m, p.model), 0);
  const limit = tallestBar > 0 ? Math.max(tallestBar, Math.min(peak, 3 * tallestBar)) : peak;
  return {
    points,
    domain: [from, to],
    yMax: limit * 1.1,
    clipped: peak > limit * 1.1,
    omitted: classes.filter(
      (c) => c.frequency > 0 && !(Number.isFinite(c.lower) && Number.isFinite(c.upper)),
    ),
  };
}

export interface RegionPoint {
  x: number;
  density: number;
  /** The density inside the queried interval, otherwise null. */
  region: number | null;
}

/** The density curve with the interval [a, b] marked. */
export function densityRegion(
  distribution: ContinuousDistribution,
  a: number,
  b: number,
): RegionPoint[] {
  let [from, to] = visibleRange(distribution);
  // Query bounds near the visible range widen it; far away ones would flatten the curve.
  const width = to - from;
  for (const x of [a, b]) {
    if (Number.isFinite(x) && x >= from - width && x <= to + width) {
      from = Math.min(from, x);
      to = Math.max(to, x);
    }
  }
  const { min, max } = distribution.support;
  return sampleAxis(from, to, [a, b, min, max]).map((x) => {
    const density = distribution.pdf(x);
    return { x, density, region: x >= a && x <= b ? density : null };
  });
}

export interface PmfBar {
  x: number;
  probability: number;
  selected: boolean;
}

/** PMF bars over the visible range, or null when there would be too many to read. */
export function pmfBars(
  distribution: DiscreteDistribution,
  a: number,
  b: number,
): PmfBar[] | null {
  const { min, max } = distribution.support;
  let first = min;
  let last = max;
  if (!(max - min < FULL_SUPPORT)) {
    const [lo, hi] = visibleRange(distribution);
    first = Math.max(Math.floor(lo), min);
    last = Math.min(Math.ceil(hi), max);
  }
  if (!(last - first < MAX_BARS)) return null;
  return Array.from({ length: last - first + 1 }, (_, i) => {
    const x = first + i;
    return { x, probability: distribution.pmf(x), selected: x >= a && x <= b };
  });
}

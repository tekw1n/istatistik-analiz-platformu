import { describe, expect, it } from 'vitest';
import {
  densityChart,
  densityRegion,
  niceAxis,
  niceTicks,
  pmfBars,
  quantile,
  visibleRange,
} from '../../src/components/charts/chartData';
import { continuousUniform } from '../../src/distributions/continuous/continuousUniform';
import { exponential } from '../../src/distributions/continuous/exponential';
import { gammaDistribution } from '../../src/distributions/continuous/gammaDistribution';
import { normal } from '../../src/distributions/continuous/normal';
import { binomial } from '../../src/distributions/discrete/binomial';
import { poisson } from '../../src/distributions/discrete/poisson';
import { integrate } from '../../src/math/numericalIntegration';

const classes = (bounds: number[], frequencies: number[]) =>
  frequencies.map((frequency, i) => ({ lower: bounds[i]!, upper: bounds[i + 1]!, frequency }));

describe('axis ranges', () => {
  it('inverts the CDF well enough for plotting, at any scale', () => {
    expect(quantile(normal(0, 1), 0.975)).toBeCloseTo(1.959963984540054, 9);
    expect(quantile(normal(1e6, 1e-3), 0.5)).toBeCloseTo(1e6, 6);
    expect(quantile(exponential(1e-6), 0.5) / 693147.1805599453).toBeCloseTo(1, 9);
  });

  it('holds almost all of the probability', () => {
    for (const d of [normal(50, 10), gammaDistribution(0.5, 3), poisson(400)]) {
      const [lo, hi] = visibleRange(d);
      expect(d.cdf(hi) - d.cdf(lo - 1)).toBeGreaterThan(0.995);
    }
  });
});

describe('ticks', () => {
  it('uses round steps inside the range', () => {
    expect(niceTicks(22.11, 108.14)).toEqual([40, 60, 80, 100]);
    expect(niceTicks(0, 12)).toEqual([0, 2, 4, 6, 8, 10, 12]);
    expect(niceTicks(-4.7, 11.26, 8)).toEqual([-4, -2, 0, 2, 4, 6, 8, 10]);
    expect(niceTicks(0.1, 0.7, 3)).toEqual([0.2, 0.4, 0.6]);
  });

  it('ends the value axis on a round number at or above the data', () => {
    expect(niceAxis(24)).toEqual({ top: 25, ticks: [0, 5, 10, 15, 20, 25] });
    expect(niceAxis(0.033).ticks.at(-1)).toBeGreaterThanOrEqual(0.033);
    expect(niceAxis(0)).toEqual({ top: 1, ticks: [0, 1] });
  });
});

describe('bounded distributions', () => {
  it('shows a uniform density with both jumps', () => {
    const chart = densityChart(continuousUniform(-5, 11), classes([0, 5, 10], [6, 4]));
    expect(chart.domain[0]).toBeLessThan(-5);
    expect(chart.domain[1]).toBeGreaterThan(11);
    expect(chart.points[0]!.model).toBe(0);
    expect(chart.points.at(-1)!.model).toBe(0);
  });

  it('draws every value of a small finite support', () => {
    expect(pmfBars(binomial(5, 0.01), 0, 0)!.map((b) => b.x)).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

describe('density chart', () => {
  const data = classes([0, 2, 4, 6], [50, 30, 20]);
  const chart = densityChart(exponential(0.4), data);

  it('scales the histogram so that its area is the relative frequency', () => {
    const height = (x: number) => chart.points.find((p) => p.x === x)!.observed;
    expect(height(0)).toBeCloseTo(0.25, 12);
    expect(height(2)).toBeCloseTo(0.15, 12);
    expect(height(6)).toBeCloseTo(0.1, 12);
    expect(chart.points.filter((p) => p.x > 6.001).every((p) => p.observed === null)).toBe(true);
  });

  it('samples the theoretical density, including its jump at the support bound', () => {
    expect(chart.points.find((p) => p.x === 2)!.model).toBeCloseTo(0.4 * Math.exp(-0.8), 14);
    expect(chart.domain[0]).toBeLessThanOrEqual(0);
    expect(chart.domain[1]).toBeGreaterThanOrEqual(6);
    const sorted = chart.points.every((p, i, all) => i === 0 || p.x > all[i - 1]!.x);
    expect(sorted).toBe(true);
    expect(chart.clipped).toBe(false);
  });

  it('leaves out open classes and says which', () => {
    const open = densityChart(normal(5, 2), classes([-Infinity, 2, 8, Infinity], [10, 80, 10]));
    expect(open.omitted.map((c) => c.frequency)).toEqual([10, 10]);
    // The share of the closed class is still relative to all observations.
    expect(open.points.find((p) => p.x === 2)!.observed).toBeCloseTo(0.8 / 6, 12);
  });

  it('clips a density that is unbounded near zero', () => {
    const spike = densityChart(gammaDistribution(0.2, 10), classes([0, 5, 10], [70, 30]));
    expect(spike.clipped).toBe(true);
    expect(spike.yMax).toBeLessThan(0.6);
    expect(spike.points.every((p) => Number.isFinite(p.model))).toBe(true);
  });
});

describe('calculator charts', () => {
  it('shades exactly the queried interval', () => {
    const points = densityRegion(normal(0, 1), -1, 1);
    const inside = points.filter((p) => p.region !== null);
    expect(inside[0]!.x).toBe(-1);
    expect(inside.at(-1)!.x).toBe(1);
    expect(integrate((x) => normal(0, 1).pdf(x), -1, 1)).toBeCloseTo(0.6826894921370859, 8);
  });

  it('ignores a bound far outside the curve', () => {
    const points = densityRegion(continuousUniform(0, 1), -Infinity, 1e12);
    expect(points.at(-1)!.x).toBeLessThan(2);
  });

  it('marks the queried bars and refuses unreadably wide ranges', () => {
    const bars = pmfBars(binomial(5, 0.5), 2, 3)!;
    expect(bars.map((b) => b.x)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(bars.filter((b) => b.selected).map((b) => b.x)).toEqual([2, 3]);
    expect(pmfBars(poisson(100_000), 0, 1)).toBeNull();
  });
});

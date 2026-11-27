import { describe, expect, it } from 'vitest';
import { chiSquareTest } from '../../src/chiSquare/hypothesisTest';
import { estimateParameters, manualParameters } from '../../src/distributions/estimation/estimate';
import { SAMPLES } from '../../src/features/data-entry/samples';
import { readClassTable, readFrequencyTable } from '../../src/features/data-entry/tables';

describe.each(SAMPLES)('sample $id', (sample) => {
  const { entry, distribution, options, reference } = sample;
  const table =
    entry.source === 'frequency'
      ? readFrequencyTable(entry.rows, entry.openLast)
      : readClassTable(entry.rows, entry.openFirst, entry.openLast);

  it('has valid data', () => {
    expect(table.errors).toEqual([]);
    expect(table.problems).toEqual([]);
    expect(table.total).toBe(reference.total);
  });

  it('reproduces the reference results', () => {
    const data = table.observations!;
    let model;
    if (sample.mode === 'manual') {
      model = manualParameters(
        distribution,
        sample.manualValues!.map((value) => ({ value, estimatedFromData: false })),
        options,
      );
    } else {
      const estimation = estimateParameters(distribution, data, options)[sample.mode];
      if (!estimation.available) throw new Error(estimation.reason);
      model = estimation;
    }
    const r = chiSquareTest(distribution, data, model, { ...options, alpha: sample.alpha });
    if (r.status !== 'ok') throw new Error(r.reason);

    const close = (actual: number, expected: number, tolerance: number) =>
      expect(Math.abs(actual - expected) / Math.abs(expected)).toBeLessThan(tolerance);
    // The exponential sample is solved numerically, to about 7 digits.
    model.params.forEach((p, i) => close(p, reference.params[i]!, 1e-6));
    close(r.statistic, reference.statistic, 1e-5);
    close(r.pValue, reference.pValue, 1e-5);
    close(r.criticalValue, reference.criticalValue, 1e-11);
    expect(r.rawRows).toHaveLength(reference.initialClassCount);
    expect(r.mergedRows).toHaveLength(reference.finalClassCount);
    expect(r.degreesOfFreedom).toBe(reference.df);
    expect(r.rejectNull).toBe(reference.rejectNull);
  });
});

describe('sample set', () => {
  it('covers the required distributions and shows merging', () => {
    expect(SAMPLES.map((s) => s.distribution)).toEqual([
      'poisson',
      'binomial',
      'discreteUniform',
      'exponential',
      'normal',
    ]);
    expect(
      SAMPLES.filter((s) => s.reference.finalClassCount < s.reference.initialClassCount),
    ).toHaveLength(3);
  });
});

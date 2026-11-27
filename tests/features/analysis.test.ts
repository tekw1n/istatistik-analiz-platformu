import katex from 'katex';
import { describe, expect, it } from 'vitest';
import { DISTRIBUTIONS, type DistributionId } from '../../src/distributions/catalog';
import { SAMPLES } from '../../src/features/data-entry/samples';
import { readClassTable, readFrequencyTable } from '../../src/features/data-entry/tables';
import type { Dataset } from '../../src/features/data-entry/types';
import { compareDistributions } from '../../src/features/distribution-comparison/compare';
import {
  alphaFrom,
  estimate,
  incompatibility,
  INITIAL_SETTINGS,
  observationsFor,
  optionsFrom,
  selectModel,
  settingsForSample,
  test as runTest,
  type Settings,
} from '../../src/features/goodness-of-fit/analysis';
import { classLabel } from '../../src/features/goodness-of-fit/classLabel';

const frequency = (values: number[], frequencies: number[]): Dataset => ({
  source: 'frequency',
  observations: { type: 'values', values, frequencies },
  classes: null,
});

const raw = (values: number[], classes: Dataset['classes'] = null): Dataset => ({
  source: 'raw',
  observations: { type: 'values', values },
  classes,
});

const classes: NonNullable<Dataset['classes']> = {
  type: 'classes',
  classes: [
    { lower: 0, upper: 2, frequency: 20 },
    { lower: 2, upper: 4, frequency: 15 },
    { lower: 4, upper: 6, frequency: 10 },
    { lower: 6, upper: 8, frequency: 8 },
  ],
};
const grouped: Dataset = { source: 'grouped', observations: classes, classes };

const compatible = (dataset: Dataset) =>
  (Object.keys(DISTRIBUTIONS) as DistributionId[]).filter(
    (id) => incompatibility(id, dataset, {}) === null,
  );

const settings = (change: Partial<Settings>): Settings => ({ ...INITIAL_SETTINGS, ...change });

describe('support filtering', () => {
  it('allows only discrete distributions for a frequency table', () => {
    expect(compatible(frequency([0, 1, 5], [3, 4, 5]))).toEqual([
      'binomial',
      'poisson',
      'discreteUniform',
    ]);
    expect(compatible(frequency([0, 1], [3, 4]))).toContain('bernoulli');
    expect(compatible(frequency([1, 2], [3, 4]))).toContain('geometric');
  });

  it('allows only continuous distributions for a grouped table', () => {
    expect(compatible(grouped)).toEqual([
      'normal',
      'exponential',
      'continuousUniform',
      'gamma',
      'logNormal',
    ]);
  });

  it('follows the support for raw data', () => {
    expect(compatible(raw([-1.5, 2.5], classes))).toEqual(['normal', 'continuousUniform']);
    expect(incompatibility('poisson', raw([1.5, 2]), {})).toContain('uygulanamaz');
    expect(incompatibility('normal', raw([3]), {})).toContain('sınıf oluşturulamadı');
  });

  it('estimates raw continuous data from the values and tests the classes', () => {
    const data = observationsFor('exponential', raw([1, 2, 3], classes));
    expect(data.ok && data.value.estimation.type).toBe('values');
    expect(data.ok && data.value.test.type).toBe('classes');
  });

  it('does not require the binomial n to list it as compatible', () => {
    const data = frequency([0, 3], [1, 1]);
    expect(incompatibility('binomial', data, {})).toBeNull();
    const result = estimate('binomial', data, {});
    expect(!result.ok && result.reason).toContain('deneme sayısı n');
  });
});

describe('choosing the parameter set', () => {
  const data = frequency([0, 1, 2, 3, 4], [109, 65, 22, 3, 1]);
  const estimates = estimate('poisson', data, {});

  it.each(['mm', 'mle'] as const)('uses the %s estimate', (mode) => {
    const model = selectModel('poisson', settings({ mode }), estimates);
    expect(model.ok && model.value.params[0]).toBeCloseTo(0.61, 12);
  });

  it('uses typed values and counts the ones marked as estimated', () => {
    const manual = (estimated: boolean) =>
      selectModel(
        'poisson',
        settings({ mode: 'manual', manual: [{ value: '0,7', estimated }] }),
        estimates,
      );
    expect(manual(false)).toMatchObject({ ok: true, value: { params: [0.7], estimatedCount: 0 } });
    expect(manual(true)).toMatchObject({ ok: true, value: { estimatedCount: 1 } });
  });

  it('lets the manual binomial n follow the known n until it is typed over', () => {
    const params = (n: string, typed?: string) => {
      const model = selectModel(
        'binomial',
        settings({
          mode: 'manual',
          n,
          manual: [{ value: typed, estimated: false }, { value: '0,5', estimated: false }],
        }),
        estimates,
      );
      return model.ok && model.value.params;
    };
    expect(params('5')).toEqual([5, 0.5]);
    expect(params('8')).toEqual([8, 0.5]);
    expect(params('8', '6')).toEqual([6, 0.5]);
  });

  it('explains missing or invalid values and unavailable methods', () => {
    const missing = selectModel('poisson', settings({ mode: 'manual' }), estimates);
    expect(!missing.ok && missing.reason).toContain('λ');
    const negative = selectModel(
      'poisson',
      settings({ mode: 'manual', manual: [{ value: '-1', estimated: false }] }),
      estimates,
    );
    expect(!negative.ok && negative.reason).toContain('pozitif');
    const open = estimate(
      'normal',
      { ...grouped, observations: { type: 'classes', classes: [
        { lower: -Infinity, upper: 1, frequency: 5 },
        { lower: 1, upper: 2, frequency: 9 },
        { lower: 2, upper: Infinity, frequency: 4 },
      ] } },
      {},
    );
    const moments = selectModel('normal', settings({ mode: 'mm' }), open);
    expect(!moments.ok && moments.reason).toContain('Açık uçlu');
  });

  it('reads α and n as typed', () => {
    expect(alphaFrom(settings({ alpha: '0,025' }))).toBe(0.025);
    for (const alpha of ['0', '1', '', 'abc']) expect(alphaFrom(settings({ alpha }))).toBeNull();
    expect(optionsFrom(settings({ n: '5' })).n).toBe(5);
    for (const n of ['', '2,5', '0', '-1']) expect(optionsFrom(settings({ n })).n).toBeUndefined();
  });
});

describe('sample presets through the analysis screens', () => {
  it.each(SAMPLES)('$id gives its reference result', (sample) => {
    const { entry } = sample;
    const table =
      entry.source === 'frequency'
        ? readFrequencyTable(entry.rows, entry.openLast)
        : readClassTable(entry.rows, entry.openFirst, entry.openLast);
    const observations = table.observations!;
    const dataset: Dataset = {
      source: entry.source,
      observations,
      classes: observations.type === 'classes' ? observations : null,
    };
    const chosen = settingsForSample(sample);
    const id = chosen.distribution!;
    const options = optionsFrom(chosen);
    const model = selectModel(id, chosen, estimate(id, dataset, options));
    if (!model.ok) throw new Error(model.reason);
    const result = runTest(id, dataset, model.value, alphaFrom(chosen)!, options);
    if (!result.ok || result.value.status !== 'ok') throw new Error('no result');
    expect(result.value.degreesOfFreedom).toBe(sample.reference.df);
    expect(result.value.statistic).toBeCloseTo(sample.reference.statistic, 4);
  });
});

describe('comparison', () => {
  const data = frequency([0, 1, 2, 3, 4], [109, 65, 22, 3, 1]);

  it('sorts valid tests by p-value and keeps the others apart', () => {
    const c = compareDistributions(data, { n: 4 }, 0.05);
    const p = c.tested.map((row) => row.result.pValue);
    expect(p).toEqual([...p].sort((a, b) => b - a));
    expect(c.tested.map((r) => r.id)).toContain('poisson');
    const all = [...c.tested, ...c.invalid, ...c.excluded].map((r) => r.id);
    expect(new Set(all).size).toBe(10);
    expect(all).toHaveLength(10);
    for (const item of [...c.invalid, ...c.excluded]) expect(item.reason).not.toBe('');
  });

  it('excludes the binomial distribution without n', () => {
    const c = compareDistributions(data, {}, 0.05);
    expect(c.excluded.find((r) => r.id === 'binomial')!.reason).toContain('n girilmelidir');
  });

  it('does not list a test with sd <= 0 as a result', () => {
    const c = compareDistributions(frequency([0, 1], [40, 60]), { n: 1 }, 0.05);
    expect(c.tested.map((r) => r.id)).not.toContain('bernoulli');
    expect(c.invalid.find((r) => r.id === 'bernoulli')!.reason).toContain('uygulanamaz');
  });

  it('tests continuous distributions on grouped data', () => {
    const c = compareDistributions(grouped, {}, 0.05);
    expect(c.tested.length + c.invalid.length).toBe(5);
    expect(c.excluded).toHaveLength(5);
  });
});

describe('class labels', () => {
  const range = (lower: number, upper: number) => ({
    lower,
    upper,
    observed: 0,
    probability: 0,
    expected: 0,
  });

  it.each([
    ['discrete', range(2, 2), 'X = 2'],
    ['discrete', range(0, 3), '0 ≤ X ≤ 3'],
    ['discrete', range(6, Infinity), 'X ≥ 6'],
    ['continuous', range(-Infinity, 2.5), 'X < 2,5'],
    ['continuous', range(2.5, 4), '2,5 ≤ X < 4'],
    ['continuous', range(4, Infinity), 'X ≥ 4'],
    ['continuous', range(-Infinity, Infinity), 'Tüm değerler'],
  ] as const)('%s %j', (kind, c, expected) => {
    expect(classLabel(kind, c)).toBe(expected);
  });
});

describe('formulas', () => {
  it('every estimation formula is valid LaTeX', () => {
    const discrete = frequency([1, 2, 3], [5, 9, 4]);
    const continuous = raw([1.5, 2, 3.5, 7], classes);
    let count = 0;
    for (const id of Object.keys(DISTRIBUTIONS) as DistributionId[]) {
      const data =
        DISTRIBUTIONS[id].kind === 'continuous'
          ? [continuous, grouped]
          : [id === 'bernoulli' ? frequency([0, 1], [2, 3]) : discrete];
      for (const dataset of data) {
        for (const geometricDefinition of ['trials', 'failures'] as const) {
          const result = estimate(id, dataset, { n: 5, geometricDefinition });
          if (!result.ok) throw new Error(result.reason);
          for (const e of [result.value.mm, result.value.mle]) {
            if (!e.available) continue;
            for (const { formula } of e.estimates) {
              expect(() =>
                katex.renderToString(formula, { throwOnError: true, strict: 'error' }),
              ).not.toThrow();
              // A lost backslash turns the spacing command \; into a visible semicolon.
              expect(formula.replaceAll('\\;', '')).not.toContain(';');
              count++;
            }
          }
        }
      }
    }
    expect(count).toBeGreaterThan(40);
  });
});

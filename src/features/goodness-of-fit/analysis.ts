import { chiSquareTest } from '../../chiSquare/hypothesisTest';
import type { ChiSquareResult, FittedModel } from '../../chiSquare/types';
import { DISTRIBUTIONS, type DistributionId } from '../../distributions/catalog';
import type { GeometricDefinition } from '../../distributions/discrete/geometric';
import { estimateParameters, manualParameters } from '../../distributions/estimation/estimate';
import { validateObservations } from '../../distributions/estimation/observations';
import type {
  Estimation,
  EstimationOptions,
  Method,
  Observations,
} from '../../distributions/estimation/types';
import { parseCell } from '../data-entry/numbers';
import type { Sample } from '../data-entry/samples';
import type { Dataset } from '../data-entry/types';

export type ParameterMode = Method | 'manual';

export interface ManualEntry {
  /** Absent until the user types: the field then shows its default. */
  value?: string;
  /** Estimated from the data being tested. */
  estimated: boolean;
}

/** Everything the user chooses on the analysis screens. */
export interface Settings {
  distribution: DistributionId | null;
  /** Binomial number of trials, as typed. */
  n: string;
  geometricDefinition: GeometricDefinition;
  mode: ParameterMode;
  manual: ManualEntry[];
  /** Significance level, as typed. */
  alpha: string;
  customAlpha: boolean;
}

export const INITIAL_SETTINGS: Settings = {
  distribution: null,
  n: '',
  geometricDefinition: 'trials',
  mode: 'mle',
  manual: [],
  alpha: '0,05',
  customAlpha: false,
};

const asText = (value: number) => String(value).replace('.', ',');

/** The distribution, parameter mode and α a sample problem asks for. */
export function settingsForSample(sample: Sample): Settings {
  const alpha = { 0.01: '0,01', 0.05: '0,05', 0.1: '0,10' }[sample.alpha];
  return {
    ...INITIAL_SETTINGS,
    distribution: sample.distribution,
    n: sample.options?.n === undefined ? '' : String(sample.options.n),
    geometricDefinition:
      sample.options?.geometricDefinition ?? INITIAL_SETTINGS.geometricDefinition,
    mode: sample.mode,
    manual: (sample.manualValues ?? []).map((v) => ({ value: asText(v), estimated: false })),
    alpha: alpha ?? asText(sample.alpha),
    customAlpha: alpha === undefined,
  };
}

/** Text of a manual field. The binomial n follows the known n until it is typed over. */
export function manualValue(id: DistributionId, settings: Settings, i: number): string {
  return settings.manual[i]?.value ?? (id === 'binomial' && i === 0 ? settings.n : '');
}

export type Outcome<T> = { ok: true; value: T } | { ok: false; reason: string };

const fail = (reason: string): { ok: false; reason: string } => ({ ok: false, reason });

/** Runs a calculation and turns a thrown error into a Turkish explanation. */
function attempt<T>(run: () => T): Outcome<T> {
  try {
    return { ok: true, value: run() };
  } catch (error) {
    // RangeError messages of the engine are written for the user.
    if (error instanceof RangeError) return fail(error.message);
    console.error(error);
    return fail('Sayısal hesaplama bu veri ve parametreler için tamamlanamadı.');
  }
}

export function optionsFrom({ n, geometricDefinition }: Settings): EstimationOptions {
  const trials = parseCell(n);
  return {
    n: trials !== null && Number.isInteger(trials) && trials >= 1 ? trials : undefined,
    geometricDefinition,
  };
}

export function alphaFrom({ alpha }: Settings): number | null {
  const value = parseCell(alpha);
  return value !== null && value > 0 && value < 1 ? value : null;
}

/**
 * The observations a distribution is estimated from and tested on. Discrete distributions use
 * exact values; continuous ones use the grouped table, or raw values with their Sturges classes.
 */
export function observationsFor(
  id: DistributionId,
  dataset: Dataset,
): Outcome<{ estimation: Observations; test: Observations }> {
  const { name, kind } = DISTRIBUTIONS[id];
  const { source, observations, classes } = dataset;
  if (kind === 'discrete') {
    if (observations.type === 'classes') {
      return fail(`${name} kesikli bir dağılımdır; sürekli gruplandırılmış veriye uygulanamaz.`);
    }
    return { ok: true, value: { estimation: observations, test: observations } };
  }
  if (source === 'frequency') {
    return fail(
      `${name} süreklidir; “Sürekli gruplandırılmış tablo” veya “Ham veri” sekmesini kullanın.`,
    );
  }
  if (!classes) {
    return fail(`${name} için ham veriden sınıf oluşturulamadı (sınıflandırma bölümüne bakın).`);
  }
  return { ok: true, value: { estimation: observations, test: classes } };
}

/** Why a distribution cannot describe the data at all, or null. Does not require binomial n. */
export function incompatibility(
  id: DistributionId,
  dataset: Dataset,
  options: EstimationOptions,
): string | null {
  const data = observationsFor(id, dataset);
  if (!data.ok) return data.reason;
  // With the largest n, only values that no binomial distribution can take are rejected.
  const relaxed = id === 'binomial' ? { ...options, n: 1_000_000 } : options;
  const checked = attempt(() => {
    validateObservations(id, data.value.estimation, relaxed);
    validateObservations(id, data.value.test, relaxed);
  });
  return checked.ok ? null : checked.reason;
}

export function estimate(
  id: DistributionId,
  dataset: Dataset,
  options: EstimationOptions,
): Outcome<{ mm: Estimation; mle: Estimation }> {
  const data = observationsFor(id, dataset);
  if (!data.ok) return data;
  return attempt(() => estimateParameters(id, data.value.estimation, options));
}

/** The parameter set chosen for the test. */
export function selectModel(
  id: DistributionId,
  settings: Settings,
  estimates: Outcome<{ mm: Estimation; mle: Estimation }>,
): Outcome<FittedModel> {
  if (settings.mode === 'manual') {
    const { parameters } = DISTRIBUTIONS[id];
    const entries = parameters.map((p, i) => {
      return {
        symbol: p.symbol,
        value: parseCell(manualValue(id, settings, i)),
        estimated: settings.manual[i]?.estimated ?? false,
      };
    });
    const missing = entries.find((e) => e.value === null);
    if (missing) return fail(`${missing.symbol} parametresi için bir sayı girin.`);
    return attempt(() =>
      manualParameters(
        id,
        entries.map((e) => ({ value: e.value!, estimatedFromData: e.estimated })),
        optionsFrom(settings),
      ),
    );
  }
  if (!estimates.ok) return estimates;
  const chosen = estimates.value[settings.mode];
  return chosen.available ? { ok: true, value: chosen } : fail(chosen.reason);
}

export function test(
  id: DistributionId,
  dataset: Dataset,
  model: FittedModel,
  alpha: number,
  options: EstimationOptions,
): Outcome<ChiSquareResult> {
  const data = observationsFor(id, dataset);
  if (!data.ok) return data;
  return attempt(() => chiSquareTest(id, data.value.test, model, { ...options, alpha }));
}

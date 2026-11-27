import { DISTRIBUTIONS, type DistributionId } from '../distributions/catalog';
import { validateObservations } from '../distributions/estimation/observations';
import type { EstimationOptions, Observations } from '../distributions/estimation/types';
import { expectedClasses } from './classes';
import { mergeClasses } from './merging';
import {
  chiSquareCriticalValue,
  chiSquarePValue,
  degreesOfFreedom,
  withContributions,
} from './statistic';
import type { ChiSquareResult, FittedModel } from './types';
import { formatNumber } from '../utils/format';

const ESTIMATED_FROM_OBSERVATIONS =
  'p-değeri yaklaşıktır: parametreler sınıf frekansları yerine gözlem değerlerinden kestirildi (Chernoff–Lehmann).';
const MERGED_AFTER_ESTIMATION =
  'p-değeri yaklaşıktır: parametreler kestirildikten sonra E < 5 olan sınıflar birleştirildi.';
const OPENED_TAILS =
  'Beklenen frekansların toplamı N olacak şekilde ilk ve son sınıf kuyrukları kapsayacak biçimde açıldı.';

export interface ChiSquareOptions extends EstimationOptions {
  /** Significance level, 0 < alpha < 1. */
  alpha?: number;
}

/** χ² goodness-of-fit test of H0: "the data follow the distribution". */
export function chiSquareTest(
  id: DistributionId,
  data: Observations,
  model: FittedModel,
  { alpha = 0.05, ...options }: ChiSquareOptions = {},
): ChiSquareResult {
  if (!(alpha > 0 && alpha < 1)) {
    throw new RangeError('Anlamlılık düzeyi α, 0 ile 1 arasında olmalıdır.');
  }
  const { estimatedCount } = model;
  if (!Number.isInteger(estimatedCount) || estimatedCount < 0) {
    throw new RangeError('Kestirilen parametre sayısı negatif olmayan tam sayı olmalıdır.');
  }
  // The binomial n of the model is the one the data must fit.
  const known = id === 'binomial' ? { ...options, n: model.params[0] } : options;
  const distribution = DISTRIBUTIONS[id].create(model.params, known);
  validateObservations(id, data, known);

  const { total, classes } = expectedClasses(id, distribution, data);
  const rawRows = withContributions(classes);

  const notes: string[] = [];
  if (data.type === 'classes') {
    const first = data.classes[0]!;
    const last = data.classes[data.classes.length - 1]!;
    if (Number.isFinite(first.lower) || Number.isFinite(last.upper)) notes.push(OPENED_TAILS);
  }

  // Checked before merging, which would hide such a class inside a neighbour.
  const impossible = rawRows.find((row) => row.contribution === null);
  if (impossible) {
    return {
      status: 'impossible',
      reason: `Model, ${formatNumber(impossible.observed)} gözlemin bulunduğu bir sınıfa sıfır (veya sayısal olarak sıfırdan ayırt edilemeyen) olasılık veriyor; gözlenen veri bu modele göre imkânsızdır ve test istatistiği hesaplanamaz.`,
      total,
      alpha,
      rawRows,
      mergedRows: [],
      history: [],
      estimatedCount,
      pValueApproximate: model.pValueApproximate,
      notes,
    };
  }

  const merged = mergeClasses(classes);
  const mergedRows = withContributions(merged.classes);
  const mergedAfterFit = model.approximateIfMerged && merged.history.length > 0;
  if (model.pValueApproximate) notes.push(ESTIMATED_FROM_OBSERVATIONS);
  else if (mergedAfterFit) notes.push(MERGED_AFTER_ESTIMATION);

  const common = {
    total,
    alpha,
    rawRows,
    mergedRows,
    history: merged.history,
    estimatedCount,
    pValueApproximate: model.pValueApproximate || mergedAfterFit,
    notes,
  };
  // After merging every E > 0, or a single class holds all N expected observations.
  const statistic = mergedRows.reduce((sum, row) => sum + row.contribution!, 0);
  const df = degreesOfFreedom(mergedRows.length, estimatedCount);
  if (df <= 0) {
    return {
      ...common,
      status: 'insufficient-df',
      degreesOfFreedom: df,
      statistic,
      reason: `Serbestlik derecesi sd = ${mergedRows.length} − 1 − ${estimatedCount} = ${df} ≤ 0 olduğundan test uygulanamaz.`,
    };
  }

  const pValue = chiSquarePValue(statistic, df);
  const rejectNull = pValue < alpha;
  const { name } = DISTRIBUTIONS[id];
  return {
    ...common,
    status: 'ok',
    degreesOfFreedom: df,
    statistic,
    pValue,
    criticalValue: chiSquareCriticalValue(df, alpha),
    rejectNull,
    conclusion: rejectNull
      ? `p < α olduğundan H₀ reddedilir: verinin ${name} dağılımına uygun olduğu varsayımı α = ${formatNumber(alpha)} düzeyinde desteklenmiyor.`
      : `p ≥ α olduğundan H₀ reddedilemez: α = ${formatNumber(alpha)} düzeyinde ${name} dağılımına uyumsuzluk için yeterli kanıt yoktur. Bu sonuç dağılımın doğru olduğunu kanıtlamaz.`,
  };
}

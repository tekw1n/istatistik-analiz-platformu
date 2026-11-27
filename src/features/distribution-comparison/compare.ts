import type { ChiSquareResult } from '../../chiSquare/types';
import { DISTRIBUTIONS, type DistributionId } from '../../distributions/catalog';
import type { EstimationOptions, Method } from '../../distributions/estimation/types';
import type { Dataset } from '../data-entry/types';
import { estimate, incompatibility, test } from '../goodness-of-fit/analysis';

export type TestedRow = {
  id: DistributionId;
  method: Method;
  params: number[];
  result: Extract<ChiSquareResult, { status: 'ok' }>;
};

export interface Comparison {
  /** Valid tests, largest p-value first. */
  tested: TestedRow[];
  /** Compatible with the data, but no valid test result. */
  invalid: { id: DistributionId; reason: string }[];
  /** Not applicable to the data. */
  excluded: { id: DistributionId; reason: string }[];
}

/**
 * Tests every distribution the data allow, with maximum likelihood estimates
 * (moments only when there is no likelihood solution).
 */
export function compareDistributions(
  dataset: Dataset,
  options: EstimationOptions,
  alpha: number,
): Comparison {
  const comparison: Comparison = { tested: [], invalid: [], excluded: [] };
  for (const id of Object.keys(DISTRIBUTIONS) as DistributionId[]) {
    const unusable =
      incompatibility(id, dataset, options) ??
      (id === 'binomial' && options.n === undefined
        ? 'Binom için bilinen deneme sayısı n girilmelidir.'
        : null);
    if (unusable) {
      comparison.excluded.push({ id, reason: unusable });
      continue;
    }
    const reject = (reason: string) => comparison.invalid.push({ id, reason });
    const estimates = estimate(id, dataset, options);
    if (!estimates.ok) {
      reject(estimates.reason);
      continue;
    }
    const { mle, mm } = estimates.value;
    const chosen = mle.available ? mle : mm;
    if (!chosen.available) {
      reject(chosen.reason);
      continue;
    }
    const outcome = test(id, dataset, chosen, alpha, options);
    if (!outcome.ok) reject(outcome.reason);
    else if (outcome.value.status !== 'ok') reject(outcome.value.reason);
    else {
      comparison.tested.push({
        id,
        method: chosen.method,
        params: chosen.params,
        result: outcome.value,
      });
    }
  }
  comparison.tested.sort((a, b) => b.result.pValue - a.result.pValue);
  return comparison;
}

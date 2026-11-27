import { useMemo } from 'react';
import type { Dataset } from '../data-entry/types';
import {
  alphaFrom,
  estimate,
  incompatibility,
  observationsFor,
  optionsFrom,
  selectModel,
  test,
  type Settings,
} from './analysis';

/** Estimates, the chosen parameter set and the test result for the current settings. */
export function useAnalysis(dataset: Dataset, settings: Settings) {
  const { distribution: id, n, geometricDefinition } = settings;
  const options = optionsFrom(settings);
  const unusable = id ? incompatibility(id, dataset, options) : null;
  // Estimation can be numerical, so it is not repeated when only the mode or α changes.
  const estimates = useMemo(
    () => (id ? estimate(id, dataset, optionsFrom({ ...settings, n, geometricDefinition })) : null),
    [id, dataset, n, geometricDefinition],
  );

  const alpha = alphaFrom(settings);
  const model = id && estimates && !unusable ? selectModel(id, settings, estimates) : null;
  const result =
    id && model?.ok && alpha !== null ? test(id, dataset, model.value, alpha, options) : null;
  const problem = model?.ok === false ? model.reason : result?.ok === false ? result.reason : null;
  const data = id ? observationsFor(id, dataset) : null;

  return { id, options, unusable, estimates, model, result, problem, data };
}

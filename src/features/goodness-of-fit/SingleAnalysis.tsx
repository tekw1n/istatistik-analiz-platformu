import { useMemo } from 'react';
import { DISTRIBUTIONS } from '../../distributions/catalog';
import type { Dataset } from '../data-entry/types';
import { DistributionSelector } from '../parameter-estimation/DistributionSelector';
import { GeometricDefinitionSelect, TrialsInput } from '../parameter-estimation/KnownValues';
import { ParameterPanel } from '../parameter-estimation/ParameterPanel';
import { AlphaInput } from './AlphaInput';
import {
  alphaFrom,
  estimate,
  incompatibility,
  optionsFrom,
  selectModel,
  test,
  type Settings,
} from './analysis';
import { ChiSquareView } from './ChiSquareView';

interface Props {
  dataset: Dataset;
  settings: Settings;
  onChange(settings: Settings): void;
}

/** Distribution selection, parameter estimation and the chi-square test of one distribution. */
export function SingleAnalysis({ dataset, settings, onChange }: Props) {
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

  return (
    <div className="space-y-8">
      <section className="space-y-3" aria-labelledby="distribution-title">
        <h2 id="distribution-title">3. Dağılım seçimi</h2>
        <DistributionSelector dataset={dataset} settings={settings} onChange={onChange} />
        {id === 'binomial' && <TrialsInput settings={settings} onChange={onChange} />}
        {id === 'geometric' && (
          <GeometricDefinitionSelect settings={settings} onChange={onChange} />
        )}
      </section>

      {id && unusable && (
        <p role="alert" className="text-sm text-danger">
          {unusable}
        </p>
      )}

      {id && estimates && !unusable && (
        <>
          <section className="space-y-3" aria-labelledby="estimation-title">
            <h2 id="estimation-title">
              4. Parametre kestirimi: {DISTRIBUTIONS[id].name}
            </h2>
            <ParameterPanel id={id} estimates={estimates} settings={settings} onChange={onChange} />
          </section>

          <section className="space-y-3" aria-labelledby="test-title">
            <h2 id="test-title">5. Ki-Kare uyum iyiliği testi</h2>
            <AlphaInput settings={settings} onChange={onChange} />
            {problem && (
              <p role="alert" className="text-sm text-danger">
                {problem}
              </p>
            )}
            {result?.ok && <ChiSquareView id={id} result={result.value} />}
          </section>
        </>
      )}
    </div>
  );
}

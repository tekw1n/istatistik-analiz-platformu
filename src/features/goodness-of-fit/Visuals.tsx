import { useState } from 'react';
import type { ChiSquareResult, FittedModel } from '../../chiSquare/types';
import { Choices } from '../../components/ui/Choices';
import { DISTRIBUTIONS, type DistributionId } from '../../distributions/catalog';
import type { EstimationOptions, Observations } from '../../distributions/estimation/types';
import type { CalculatorInput } from '../probability-calculator/calculate';
import { ProbabilityCalculator } from '../probability-calculator/ProbabilityCalculator';
import { DensitySection, FrequencySection } from './Charts';

type TableChoice = 'raw' | 'merged';

/** Charts and the probability calculator for the chosen parameter set. */
export default function Visuals({
  id,
  model,
  options,
  testData,
  result,
  calculator,
  onCalculator,
}: {
  id: DistributionId;
  model: FittedModel;
  options: EstimationOptions;
  testData: Observations;
  result: ChiSquareResult | null;
  calculator: CalculatorInput;
  onCalculator: (value: CalculatorInput) => void;
}) {
  const [table, setTable] = useState<TableChoice>('raw');
  const { name, create, mean } = DISTRIBUTIONS[id];
  // The binomial n of the model replaces the known n.
  const distribution = create(model.params, options);

  const hasMerged = result !== null && result.mergedRows.length > 0;
  const rows = result && (table === 'merged' && hasMerged ? result.mergedRows : result.rawRows);

  return (
    <div className="space-y-8">
      <section className="space-y-5" aria-labelledby="charts-title">
        <h2 id="charts-title">6. Grafikler</h2>
        {rows ? (
          <>
            {hasMerged && (
              <Choices
                legend="Frekans grafiğindeki sınıflar"
                options={[
                  { value: 'raw', label: 'Ham sınıflar' },
                  { value: 'merged', label: 'Birleştirilmiş sınıflar' },
                ]}
                value={table}
                onChange={setTable}
              />
            )}
            <FrequencySection kind={distribution.kind} rows={rows} />
          </>
        ) : (
          <p className="hint">Frekans grafiği için geçerli bir test ayarı gerekir.</p>
        )}
        <DensitySection name={name} distribution={distribution} testData={testData} />
      </section>

      <section className="space-y-3" aria-labelledby="calculator-title">
        <h2 id="calculator-title">7. Olasılık hesaplayıcı</h2>
        <ProbabilityCalculator
          id={id}
          distribution={distribution}
          params={model.params}
          mean={mean(model.params, options)}
          value={calculator}
          onChange={onCalculator}
        />
      </section>
    </div>
  );
}

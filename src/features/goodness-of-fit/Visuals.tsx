import { useState } from 'react';
import type { ChiSquareResult, FittedModel } from '../../chiSquare/types';
import { DensityChart } from '../../components/charts/DensityChart';
import { FrequencyChart, MAX_CLASSES } from '../../components/charts/FrequencyChart';
import { Choices } from '../../components/ui/Choices';
import { DISTRIBUTIONS, type DistributionId } from '../../distributions/catalog';
import type { EstimationOptions, Observations } from '../../distributions/estimation/types';
import {
  ProbabilityCalculator,
  type CalculatorInput,
} from '../probability-calculator/ProbabilityCalculator';

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
  const { name, create } = DISTRIBUTIONS[id];
  // The binomial n of the model replaces the known n.
  const distribution = create(model.params, options);

  const hasMerged = result !== null && result.mergedRows.length > 0;
  const rows = result && (table === 'merged' && hasMerged ? result.mergedRows : result.rawRows);

  return (
    <>
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
            {rows.length > MAX_CLASSES ? (
              <p className="hint">
                {rows.length} sınıf bir grafikte okunamaz (en fazla {MAX_CLASSES}); hesap
                tablolarını kullanın.
              </p>
            ) : (
              <FrequencyChart kind={distribution.kind} rows={rows} />
            )}
          </>
        ) : (
          <p className="hint">Frekans grafiği için geçerli bir test ayarı gerekir.</p>
        )}
        {distribution.kind === 'continuous' && testData.type === 'classes' && (
          <DensityChart name={name} distribution={distribution} classes={testData.classes} />
        )}
      </section>

      <section className="space-y-3" aria-labelledby="calculator-title">
        <h2 id="calculator-title">7. Olasılık hesaplayıcı</h2>
        <ProbabilityCalculator
          id={id}
          distribution={distribution}
          params={model.params}
          value={calculator}
          onChange={onCalculator}
        />
      </section>
    </>
  );
}

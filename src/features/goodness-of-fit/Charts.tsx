import type { ChiSquareRow } from '../../chiSquare/types';
import { DensityChart } from '../../components/charts/DensityChart';
import { FrequencyChart, MAX_CLASSES } from '../../components/charts/FrequencyChart';
import type { Distribution } from '../../distributions/distributionTypes';
import type { Observations } from '../../distributions/estimation/types';

/** Observed / expected frequencies of the given classes. */
export function FrequencySection({
  kind,
  rows,
  width,
  title,
}: {
  title?: string;
  kind: Distribution['kind'];
  rows: ChiSquareRow[];
  width?: number;
}) {
  if (rows.length > MAX_CLASSES) {
    return (
      <p className="hint">
        {rows.length} sınıf bir grafikte okunamaz (en fazla {MAX_CLASSES}); hesap tablolarını
        kullanın.
      </p>
    );
  }
  return <FrequencyChart kind={kind} rows={rows} width={width} title={title} />;
}

/** The density curve over the data histogram; nothing for discrete distributions. */
export function DensitySection({
  name,
  distribution,
  testData,
  width,
}: {
  name: string;
  distribution: Distribution;
  testData: Observations;
  width?: number;
}) {
  if (distribution.kind !== 'continuous' || testData.type !== 'classes') return null;
  return (
    <DensityChart
      name={name}
      distribution={distribution}
      classes={testData.classes}
      width={width}
    />
  );
}

import { useId } from 'react';
import { formatNumber } from '../../utils/format';
import type { Dataset } from '../data-entry/types';
import { distributionHints, summarize } from './summary';

const show = (value: number | null) => (value === null ? 'Tanımsız' : formatNumber(value, 4));

export function PreliminaryAnalysis({
  dataset,
  title = '2. Ön analiz',
}: {
  dataset: Dataset;
  title?: string;
}) {
  const titleId = useId();
  const summary = summarize(dataset);
  const hints = distributionHints(dataset, summary);
  const s = summary.ok ? summary.statistics : null;
  const cards: [string, string][] = s
    ? [
        ['Gözlem sayısı N', formatNumber(s.n)],
        ['Ortalama x̄', show(s.mean)],
        ['Örneklem varyansı s²', show(s.sampleVariance)],
        ['Örneklem std. sapması s', show(s.sampleStdDev)],
        ['En küçük', show(s.min)],
        ['En büyük', show(s.max)],
        ['Çarpıklık g₁', show(s.skewness)],
        ['Varyasyon katsayısı s / x̄', show(s.coefficientOfVariation)],
        ['Varyans / ortalama s² / x̄', show(s.varianceToMeanRatio)],
      ]
    : [['Gözlem sayısı N', formatNumber(summary.ok ? 0 : summary.n)]];

  return (
    <section className="card space-y-4" aria-labelledby={titleId}>
      <h2 id={titleId}>{title}</h2>
      {summary.ok && summary.approximate && (
        <p className="rounded-md border-l-4 border-warning bg-warning-soft p-3 text-sm text-warning">
          Değerler sınıf orta noktalarından hesaplanmıştır ve <strong>yaklaşıktır</strong>.
        </p>
      )}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map(([term, value]) => (
          <div key={term} className="keep-together rounded-md border border-line p-3">
            <dt className="hint">{term}</dt>
            <dd className="font-mono text-lg font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      {!summary.ok && <p className="hint">{summary.reason}</p>}
      {hints.length > 0 && (
        <div>
          <h3>Dağılım ipuçları</h3>
          <ul className="list-disc pl-5 text-sm">
            {hints.map((hint) => (
              <li key={hint}>{hint}</li>
            ))}
          </ul>
          <p className="hint">
            Bunlar yalnızca istatistiksel ipuçlarıdır; uygunluk kararı vermez.
          </p>
        </div>
      )}
    </section>
  );
}

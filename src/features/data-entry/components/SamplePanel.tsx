import { DISTRIBUTIONS } from '../../../distributions/catalog';
import { formatNumber } from '../../../utils/format';
import type { Sample } from '../samples';

const MODES = {
  mm: 'Momentler metodu',
  mle: 'En çok olabilirlik (EÇOK)',
  manual: 'Bilinen parametreler (m = 0)',
};

/** Question, expected calculations and reference results of a sample problem. */
export function SamplePanel({ sample }: { sample: Sample }) {
  const { reference: r, distribution } = sample;
  const { name, parameters } = DISTRIBUTIONS[distribution];
  const results: [string, string][] = [
    ...parameters.map((p, i): [string, string] => [p.symbol, formatNumber(r.params[i]!)]),
    ['N', formatNumber(r.total)],
    ['Sınıf sayısı (ilk → son)', `${r.initialClassCount} → ${r.finalClassCount}`],
    ['Serbestlik derecesi', String(r.df)],
    ['χ² istatistiği', formatNumber(r.statistic, 4)],
    ['Kritik değer', formatNumber(r.criticalValue, 4)],
    ['p-değeri', formatNumber(r.pValue, 4)],
    ['Karar', r.rejectNull ? 'H₀ reddedilir' : 'H₀ reddedilemez'],
  ];
  return (
    <article className="rounded-md border border-line bg-muted p-4">
      <h3>{sample.title}</h3>
      <p className="mt-1">{sample.question}</p>
      <p className="mt-2 text-sm">
        Dağılım: <strong>{name}</strong> · Parametre modu: <strong>{MODES[sample.mode]}</strong> ·
        α = {formatNumber(sample.alpha)}
      </p>
      <details className="mt-2">
        <summary className="min-h-11 cursor-pointer py-2 font-medium text-primary">
          Beklenen hesaplamalar ve referans sonuçlar
        </summary>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {sample.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <dl className="mt-3 grid max-w-md grid-cols-[1fr_auto] gap-x-6 text-sm">
          {results.map(([term, value]) => (
            <div key={term} className="col-span-2 grid grid-cols-subgrid border-b border-line py-1">
              <dt>{term}</dt>
              <dd className="text-right font-mono tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </details>
    </article>
  );
}

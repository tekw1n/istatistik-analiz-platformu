import { useMemo } from 'react';
import { ScrollArea } from '../../components/ui/ScrollArea';
import { DISTRIBUTIONS, type DistributionId } from '../../distributions/catalog';
import type { Method } from '../../distributions/estimation/types';
import { formatNumber } from '../../utils/format';
import type { Dataset } from '../data-entry/types';
import { AlphaInput } from '../goodness-of-fit/AlphaInput';
import { alphaFrom, optionsFrom, type Settings } from '../goodness-of-fit/analysis';
import { GeometricDefinitionSelect, TrialsInput } from '../parameter-estimation/KnownValues';
import { compareDistributions } from './compare';

const METHODS: Record<Method, string> = { mle: 'EÇOK', mm: 'M.M.' };

function Reasons({ title, items }: { title: string; items: { id: DistributionId; reason: string }[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3>{title}</h3>
      <ul className="list-disc pl-5 text-sm">
        {items.map((item) => (
          <li key={item.id}>
            <strong>{DISTRIBUTIONS[item.id].name}:</strong> {item.reason}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ComparisonView({
  dataset,
  settings,
  onChange,
  onOpen,
}: {
  dataset: Dataset;
  settings: Settings;
  onChange(settings: Settings): void;
  onOpen(id: DistributionId, method: Method): void;
}) {
  const alpha = alphaFrom(settings);
  const { n, geometricDefinition } = settings;
  const comparison = useMemo(
    () =>
      alpha === null
        ? null
        : compareDistributions(dataset, optionsFrom({ ...settings, n, geometricDefinition }), alpha),
    [dataset, n, geometricDefinition, alpha],
  );

  return (
    <section className="space-y-4" aria-labelledby="comparison-title">
      <h2 id="comparison-title">3. Otomatik dağılım karşılaştırması</h2>
      <div className="flex flex-wrap gap-6">
        <TrialsInput settings={settings} onChange={onChange} />
        <GeometricDefinitionSelect settings={settings} onChange={onChange} />
      </div>
      <AlphaInput settings={settings} onChange={onChange} />
      <p className="rounded-md border-l-4 border-warning bg-warning-soft p-3 text-sm text-warning">
        Daha yüksek p-değeri, dağılımın doğru veya kesin olarak daha iyi olduğunu göstermez.
        Serbestlik dereceleri ve birleştirilen sınıflar farklı olduğunda p-değerleri doğrudan
        karşılaştırılamaz.
      </p>

      {comparison && (
        <>
          {comparison.tested.length > 0 ? (
            <ScrollArea label="Karşılaştırma tablosu">
              <table className="data-table tabular-nums">
                <caption>Geçerli testler (p-değerine göre azalan)</caption>
                <thead>
                  <tr>
                    <th scope="col">Dağılım</th>
                    <th scope="col">Parametreler</th>
                    {['sd', 'χ²', 'p-değeri'].map((head) => (
                      <th key={head} scope="col" className="text-right">
                        {head}
                      </th>
                    ))}
                    <th scope="col">Karar</th>
                    <th scope="col">
                      <span className="sr-only">İşlem</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.tested.map(({ id, method, params, warnings, result }) => (
                    <tr key={id}>
                      <th scope="row" className="!border-b !border-line">
                        {DISTRIBUTIONS[id].name}
                        <span className="hint block font-normal">{METHODS[method]}</span>
                      </th>
                      <td className="font-mono">
                        {DISTRIBUTIONS[id].parameters.map((p, i) => (
                          <span key={p.symbol} className="block whitespace-nowrap">
                            {p.symbol} = {formatNumber(params[i]!, 4)}
                          </span>
                        ))}
                        {warnings.map((warning) => (
                          <span
                            key={warning}
                            className="mt-1 block max-w-xs font-sans text-xs text-warning"
                          >
                            {warning}
                          </span>
                        ))}
                      </td>
                      <td className="num">{result.degreesOfFreedom}</td>
                      <td className="num">{formatNumber(result.statistic, 4)}</td>
                      <td className="num">
                        {formatNumber(result.pValue)}
                        {result.pValueApproximate && (
                          <span className="hint block">yaklaşık</span>
                        )}
                      </td>
                      <td>H₀ {result.rejectNull ? 'reddedilir' : 'reddedilemez'}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-secondary"
                          aria-label={`${DISTRIBUTIONS[id].name} ayrıntılı analiz`}
                          onClick={() => onOpen(id, method)}
                        >
                          Ayrıntı
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          ) : (
            <p className="text-sm">Bu veri ve ayarlarla geçerli test üreten dağılım yok.</p>
          )}
          <Reasons title="Test sonucu üretilemeyenler" items={comparison.invalid} />
          <Reasons title="Veriye uygulanamayanlar" items={comparison.excluded} />
        </>
      )}
    </section>
  );
}

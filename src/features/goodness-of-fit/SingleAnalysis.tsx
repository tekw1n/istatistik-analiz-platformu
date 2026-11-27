import { lazy, Suspense } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { DISTRIBUTIONS } from '../../distributions/catalog';
import type { Dataset } from '../data-entry/types';
import { DistributionSelector } from '../parameter-estimation/DistributionSelector';
import { GeometricDefinitionSelect, TrialsInput } from '../parameter-estimation/KnownValues';
import { ParameterPanel } from '../parameter-estimation/ParameterPanel';
import { AlphaInput } from './AlphaInput';
import type { Settings } from './analysis';
import { ChiSquareView } from './ChiSquareView';
import { useAnalysis } from './useAnalysis';

// The chart library is large, so it is loaded when an analysis is first shown.
const Visuals = lazy(() => import('./Visuals'));

interface Props {
  dataset: Dataset;
  settings: Settings;
  onChange(settings: Settings): void;
  onReport(): void;
  /** Charts cannot measure themselves while the page is hidden behind the report. */
  hidden: boolean;
}

/** Distribution selection, parameter estimation and the chi-square test of one distribution. */
export function SingleAnalysis({ dataset, settings, onChange, onReport, hidden }: Props) {
  const { id, options, unusable, estimates, model, result, problem, data } = useAnalysis(
    dataset,
    settings,
  );

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

      {!id && (
        <EmptyState title="Henüz dağılım seçilmedi">
          Parametre kestirimi, Ki-Kare testi, grafikler ve rapor için yukarıdan veriye uygun bir
          dağılım seçin.
        </EmptyState>
      )}

      {id && unusable && (
        <div role="alert">
          <EmptyState tone="error" title="Bu dağılım mevcut veriye uygulanamaz">
            {unusable} Başka bir dağılım seçin veya veriyi düzenleyin.
          </EmptyState>
        </div>
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
              <div role="alert">
                <EmptyState tone="error" title="Test yapılamadı">
                  {problem}
                </EmptyState>
              </div>
            )}
            {result?.ok && <ChiSquareView id={id} result={result.value} />}
          </section>

          {model?.ok && data?.ok && !hidden && (
            <ErrorBoundary resetKey={model.value}>
              <Suspense fallback={<p role="status">Grafikler yükleniyor…</p>}>
                <Visuals
                  id={id}
                  model={model.value}
                  options={options}
                  testData={data.value.test}
                  result={result?.ok ? result.value : null}
                  calculator={settings.calculator}
                  onCalculator={(calculator) => onChange({ ...settings, calculator })}
                />
              </Suspense>
            </ErrorBoundary>
          )}

          <section className="space-y-2" aria-labelledby="report-title">
            <h2 id="report-title">8. Rapor</h2>
            <p className="hint">
              Veri, kestirimler, hesap tabloları, karar, grafikler ve yorum tek bir A4 raporunda
              toplanır; yazdırabilir veya PDF olarak kaydedebilirsiniz.
            </p>
            <button
              id="open-report"
              type="button"
              className="btn-primary"
              disabled={!result?.ok}
              onClick={onReport}
            >
              Raporu görüntüle
            </button>
          </section>
        </>
      )}
    </div>
  );
}

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { EmptyState } from './components/ui/EmptyState';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { TabPanel, Tabs } from './components/ui/Tabs';
import type { DistributionId } from './distributions/catalog';
import type { Method } from './distributions/estimation/types';
import { DataEntry } from './features/data-entry/components/DataEntry';
import type { Sample } from './features/data-entry/samples';
import type { Dataset } from './features/data-entry/types';
import { ComparisonView } from './features/distribution-comparison/ComparisonView';
import { INITIAL_SETTINGS, settingsForSample } from './features/goodness-of-fit/analysis';
import { SingleAnalysis } from './features/goodness-of-fit/SingleAnalysis';
import { PreliminaryAnalysis } from './features/preliminary-analysis/PreliminaryAnalysis';

const Report = lazy(() => import('./features/reporting/Report'));

const VIEWS = [
  { id: 'single', label: 'Tekil analiz' },
  { id: 'compare', label: 'Dağılım karşılaştırması' },
] as const;

type View = (typeof VIEWS)[number]['id'];

export function App() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [view, setView] = useState<View>('single');

  const [report, setReport] = useState(false);
  const wasOpen = useRef(false);

  // Returning from the report puts the keyboard focus back on the button that opened it.
  useEffect(() => {
    if (!report && wasOpen.current) document.getElementById('open-report')?.focus();
    wasOpen.current = report;
  }, [report]);

  const closeReport = useCallback(() => setReport(false), []);

  const loadSample = useCallback((sample: Sample) => {
    setSettings(settingsForSample(sample));
    setView('single');
  }, []);

  const open = (distribution: DistributionId, mode: Method) => {
    setSettings({
      ...settings,
      distribution,
      mode,
      manual: [],
      calculator: INITIAL_SETTINGS.calculator,
    });
    setView('single');
    document.getElementById('analysis-tab-single')?.focus();
  };

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        hidden={report}
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-10 focus:rounded-md focus:bg-primary focus:px-4 focus:py-3 focus:text-white print:hidden"
      >
        İçeriğe geç
      </a>
      <header className="border-b border-line bg-surface print:hidden" hidden={report}>
        <div className="mx-auto max-w-6xl px-4 py-4 lg:px-8">
          <h1>Olasılık Dağılımları ve Ki-Kare Uyum İyiliği Analizi</h1>
          <p className="hint">Tüm hesaplamalar tarayıcınızda yapılır; veriler sunucuya gönderilmez.</p>
        </div>
      </header>
      {report && dataset && (
        <ErrorBoundary resetKey={dataset}>
          <Suspense fallback={<p role="status" className="p-6">Rapor hazırlanıyor…</p>}>
            <Report dataset={dataset} settings={settings} onClose={closeReport} />
          </Suspense>
        </ErrorBoundary>
      )}
      {/* Kept mounted behind the report so that nothing the user entered is lost. */}
      <main
        id="main"
        tabIndex={-1}
        hidden={report}
        className="mx-auto max-w-6xl space-y-5 px-4 py-6 lg:px-8 print:hidden"
      >
        <DataEntry onDataset={setDataset} onSample={loadSample} />
        {dataset ? (
          <ErrorBoundary resetKey={dataset}>
            <PreliminaryAnalysis dataset={dataset} />
            <div className="card space-y-5">
              <Tabs
                label="Analiz modu"
                name="analysis"
                tabs={VIEWS}
                active={view}
                onSelect={setView}
              />
              <TabPanel name="analysis" id="single" active={view}>
                <SingleAnalysis
                  dataset={dataset}
                  settings={settings}
                  onChange={setSettings}
                  onReport={() => setReport(true)}
                  hidden={report}
                />
              </TabPanel>
              <TabPanel name="analysis" id="compare" active={view}>
                {/* Mounted only when visible: it estimates every distribution. */}
                {view === 'compare' && (
                  <ComparisonView
                    dataset={dataset}
                    settings={settings}
                    onChange={setSettings}
                    onOpen={open}
                  />
                )}
              </TabPanel>
            </div>
          </ErrorBoundary>
        ) : (
          <div role="status" className="card">
            <EmptyState
              title="Analize geçmek için geçerli bir veri girin"
              action={
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => document.getElementById('sample')?.focus()}
                >
                  Hazır örnek seç
                </button>
              }
            >
              Yukarıdaki sekmelerden birine tablo veya ham veri girin; hatalı hücreler kırmızıyla
              açıklanır. Denemek için hazır bir örnek soru da yükleyebilirsiniz.
            </EmptyState>
          </div>
        )}
      </main>
    </div>
  );
}

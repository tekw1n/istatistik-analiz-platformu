import { useCallback, useState } from 'react';
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

const VIEWS = [
  { id: 'single', label: 'Tekil analiz' },
  { id: 'compare', label: 'Dağılım karşılaştırması' },
] as const;

type View = (typeof VIEWS)[number]['id'];

export function App() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [view, setView] = useState<View>('single');

  const loadSample = useCallback((sample: Sample) => {
    setSettings(settingsForSample(sample));
    setView('single');
  }, []);

  const open = (distribution: DistributionId, mode: Method) => {
    setSettings({ ...settings, distribution, mode, manual: [] });
    setView('single');
    document.getElementById('analysis-tab-single')?.focus();
  };

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <h1>Olasılık Dağılımları ve Ki-Kare Uyum İyiliği Analizi</h1>
          <p className="hint">Tüm hesaplamalar tarayıcınızda yapılır; veriler sunucuya gönderilmez.</p>
        </div>
      </header>
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        <DataEntry onDataset={setDataset} onSample={loadSample} />
        {dataset ? (
          <>
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
                <SingleAnalysis dataset={dataset} settings={settings} onChange={setSettings} />
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
          </>
        ) : (
          <p role="status" className="card text-sm">
            Analize geçmek için geçerli bir veri girin.
          </p>
        )}
      </main>
    </div>
  );
}

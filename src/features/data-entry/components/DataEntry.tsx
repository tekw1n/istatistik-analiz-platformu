import { useCallback, useEffect, useState } from 'react';
import { TabPanel, Tabs } from '../../../components/ui/Tabs';
import { SAMPLES, type Sample } from '../samples';
import type { Dataset } from '../types';
import { FrequencyForm } from './FrequencyForm';
import { GroupedForm } from './GroupedForm';
import { RawDataForm } from './RawDataForm';
import { SamplePanel } from './SamplePanel';

const TABS = [
  { id: 'frequency', label: 'Kesikli frekans tablosu' },
  { id: 'grouped', label: 'Sürekli gruplandırılmış tablo' },
  { id: 'raw', label: 'Ham veri ve CSV' },
] as const;

type Source = Dataset['source'];

interface Props {
  onDataset(dataset: Dataset | null): void;
  /** Lets the analysis preselect the distribution, mode and α of a loaded sample. */
  onSample(sample: Sample): void;
}

/** The three input tabs. Each keeps its own entries; the active tab provides the dataset. */
export function DataEntry({ onDataset, onSample }: Props) {
  const [active, setActive] = useState<Source>('frequency');
  const [datasets, setDatasets] = useState<Partial<Record<Source, Dataset | null>>>({});
  const [sampleId, setSampleId] = useState('');
  // Bumped on every load so that the same sample can be loaded again.
  const [loads, setLoads] = useState({ frequency: 0, grouped: 0 });
  const [loaded, setLoaded] = useState<Partial<Record<Source, string>>>({});

  const report = useCallback(
    (source: Source) => (dataset: Dataset | null) =>
      setDatasets((all) => ({ ...all, [source]: dataset })),
    [],
  );
  const [reporters] = useState(() => ({
    frequency: report('frequency'),
    grouped: report('grouped'),
    raw: report('raw'),
  }));

  const current = datasets[active] ?? null;
  useEffect(() => onDataset(current), [current, onDataset]);

  const sampleOf = (source: Source) => SAMPLES.find((s) => s.id === loaded[source]);
  const sample = sampleOf(active);

  const load = () => {
    const chosen = SAMPLES.find((s) => s.id === sampleId);
    if (!chosen) return;
    const { source } = chosen.entry;
    setLoaded((all) => ({ ...all, [source]: chosen.id }));
    setLoads((n) => ({ ...n, [source]: n[source] + 1 }));
    setActive(source);
    onSample(chosen);
  };

  const frequencySample = sampleOf('frequency')?.entry;
  const groupedSample = sampleOf('grouped')?.entry;

  return (
    <section className="card space-y-5" aria-labelledby="data-entry-title">
      <h2 id="data-entry-title">1. Veri girişi</h2>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-64 flex-1">
          <label className="label" htmlFor="sample">
            Hazır örnek soru
          </label>
          <select
            id="sample"
            className="field"
            value={sampleId}
            onChange={(e) => setSampleId(e.target.value)}
          >
            <option value="">Örnek seçin…</option>
            {SAMPLES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="btn-primary" disabled={!sampleId} onClick={load}>
          Örneği yükle
        </button>
      </div>
      <p className="hint">Örnek yüklemek ilgili sekmedeki tablonun yerine geçer.</p>

      <Tabs
        label="Veri giriş yöntemi"
        name="data"
        tabs={TABS}
        active={active}
        onSelect={setActive}
      />

      {sample && <SamplePanel sample={sample} />}

      {/* All panels stay mounted so that switching tabs does not lose entries. */}
      <TabPanel name="data" id="frequency" active={active}>
        <FrequencyForm
          key={loads.frequency}
          initial={frequencySample?.source === 'frequency' ? frequencySample : undefined}
          onDataset={reporters.frequency}
        />
      </TabPanel>
      <TabPanel name="data" id="grouped" active={active}>
        <GroupedForm
          key={loads.grouped}
          initial={groupedSample?.source === 'grouped' ? groupedSample : undefined}
          onDataset={reporters.grouped}
        />
      </TabPanel>
      <TabPanel name="data" id="raw" active={active}>
        <RawDataForm onDataset={reporters.raw} />
      </TabPanel>
    </section>
  );
}

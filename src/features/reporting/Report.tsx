import { useEffect, useRef, useState, type ReactNode } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { DISTRIBUTIONS } from '../../distributions/catalog';
import { formatNumber } from '../../utils/format';
import type { Dataset } from '../data-entry/types';
import type { Settings } from '../goodness-of-fit/analysis';
import { DensitySection, FrequencySection } from '../goodness-of-fit/Charts';
import { ChiSquareView } from '../goodness-of-fit/ChiSquareView';
import { useAnalysis } from '../goodness-of-fit/useAnalysis';
import { EstimationCard } from '../parameter-estimation/ParameterPanel';
import { PreliminaryAnalysis } from '../preliminary-analysis/PreliminaryAnalysis';
import { summarize } from '../preliminary-analysis/summary';
import { DataTable } from './DataTable';
import { interpret } from './interpretation';

/** Charts keep this pixel width, which fits A4 portrait, on screen and on paper. */
const CHART_WIDTH = 680;

const MODES = { mle: 'EÇOK', mm: 'Momentler metodu', manual: 'Elle girilen parametreler' };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="border-b border-ink pb-1">{title}</h2>
      {children}
    </section>
  );
}

export default function Report({
  dataset,
  settings,
  onClose,
}: {
  dataset: Dataset;
  settings: Settings;
  onClose: () => void;
}) {
  const { id, options, estimates, model, result, data } = useAnalysis(dataset, settings);
  const name = id ? DISTRIBUTIONS[id].name : '';
  const [title, setTitle] = useState(`Ki-Kare Uyum İyiliği Analizi: ${name} Dağılımı`);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
    window.scrollTo(0, 0);
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [onClose]);

  // Browsers propose the document title as the name of the PDF file.
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);

  const back = (
    <button type="button" className="btn-secondary" onClick={onClose}>
      Analize dön
    </button>
  );

  if (!id || !model?.ok || !result?.ok || !data?.ok) {
    return (
      <main className="p-6">
        <EmptyState title="Rapor oluşturulamadı" action={back}>
          Rapor için seçili dağılımda geçerli bir Ki-Kare analizi gerekir.
        </EmptyState>
      </main>
    );
  }

  const { parameters, create } = DISTRIBUTIONS[id];
  const distribution = create(model.value.params, options);
  const summary = summarize(dataset);
  const test = result.value;

  return (
    <main className="px-4 py-6 print:p-0">
      <div className="mx-auto mb-4 flex max-w-[45rem] flex-wrap items-end gap-3 print:hidden">
        <div className="min-w-64 flex-1">
          <label className="label" htmlFor="report-heading">
            Analiz başlığı
          </label>
          <input
            id="report-heading"
            className="field"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <button type="button" className="btn-primary" onClick={() => window.print()}>
          Yazdır / PDF kaydet
        </button>
        {back}
      </div>

      {/* The page is as wide as the paper; narrow screens scroll it sideways. */}
      <div className="overflow-x-auto print:overflow-visible">
        <article className="mx-auto w-[720px] space-y-6 rounded-lg border border-line bg-surface p-5 print:w-auto print:border-0 print:p-0">
          <header>
            <h1 ref={heading} tabIndex={-1} className="print:outline-none">
              {title.trim() || 'Ki-Kare Uyum İyiliği Analizi'}
            </h1>
            <p className="hint">Rapor tarihi: {new Date().toLocaleDateString('tr-TR')}</p>
          </header>

          <Section title="1. Veri">
            <DataTable observations={dataset.observations} />
            {dataset.source === 'raw' && data.value.test.type === 'classes' && (
              <>
                <h3>Sürekli dağılım testi için sınıflandırılmış veri</h3>
                <DataTable observations={data.value.test} />
              </>
            )}
          </Section>

          <PreliminaryAnalysis dataset={dataset} title="2. Özet istatistikler" />

          <Section title="3. Dağılım ve parametre kestirimleri">
            {/* The heading, this sentence and the first card stay on the same page. */}
            <div className="keep-together space-y-3">
              <p>
                Dağılım: <strong>{name}</strong>. Testte kullanılan parametre seti:{' '}
                <strong>{MODES[settings.mode]}</strong> (
                {parameters
                  .map((p, i) => `${p.symbol} = ${formatNumber(model.value.params[i]!)}`)
                  .join(', ')}
                ; m = {model.value.estimatedCount}).
              </p>
              {estimates?.ok && (
                <EstimationCard
                  title="Momentler Metodu (M.M.)"
                  estimation={estimates.value.mm}
                  selected={settings.mode === 'mm'}
                />
              )}
            </div>
            {estimates?.ok && (
              <EstimationCard
                title="En Çok Olabilirlik (EÇOK)"
                estimation={estimates.value.mle}
                selected={settings.mode === 'mle'}
              />
            )}
          </Section>

          <Section title="4. Ki-Kare uyum iyiliği testi">
            <ChiSquareView id={id} result={test} expanded />
          </Section>

          <Section title="5. Grafikler">
            <FrequencySection kind={distribution.kind} rows={test.rawRows} width={CHART_WIDTH} />
            {test.history.length > 0 && test.mergedRows.length > 0 && (
              <FrequencySection
                title="Gözlenen ve beklenen frekanslar: birleştirilmiş sınıflar"
                kind={distribution.kind}
                rows={test.mergedRows}
                width={CHART_WIDTH}
              />
            )}
            <DensitySection
              name={name}
              distribution={distribution}
              testData={data.value.test}
              width={CHART_WIDTH}
            />
          </Section>

          <Section title="6. İstatistiksel yorum">
            {interpret(name, settings.mode, test, summary.ok && summary.approximate).map(
              (paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ),
            )}
          </Section>
        </article>
      </div>
    </main>
  );
}

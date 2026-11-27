import { useState } from 'react';
import { DataEntry } from './features/data-entry/components/DataEntry';
import type { Dataset } from './features/data-entry/types';

/** N of a dataset, over every class including an open tail. */
function total({ observations }: Dataset): number {
  if (observations.type === 'classes') {
    return observations.classes.reduce((sum, c) => sum + c.frequency, 0);
  }
  const { values, frequencies, openTail } = observations;
  const listed = frequencies ? frequencies.reduce((a, b) => a + b, 0) : values.length;
  return listed + (openTail?.frequency ?? 0);
}

export function App() {
  const [dataset, setDataset] = useState<Dataset | null>(null);

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <h1>Olasılık Dağılımları ve Ki-Kare Uyum İyiliği Analizi</h1>
          <p className="hint">Tüm hesaplamalar tarayıcınızda yapılır; veriler sunucuya gönderilmez.</p>
        </div>
      </header>
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        <DataEntry onDataset={setDataset} />
        <p role="status" className="card text-sm">
          {dataset ? (
            <>
              <strong className="text-success">Veri hazır.</strong> N ={' '}
              {total(dataset).toLocaleString('tr-TR')}. Analiz ekranı bir sonraki geliştirme
              aşamasında eklenecektir.
            </>
          ) : (
            'Analize geçmek için geçerli bir veri girin.'
          )}
        </p>
      </main>
    </div>
  );
}

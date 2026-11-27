import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Messages } from '../../../components/ui/Messages';
import { formatNumber } from '../../../utils/format';
import { headerOf, parseText, type TextFormat } from '../parseText';
import { decodeCsv, frequencyTable, readValues } from '../rawData';
import { classify, MAX_CLASS_COUNT, sturgesClassCount } from '../sturges';
import type { Dataset } from '../types';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_LISTED = 200;
const DELIMITERS = {
  tab: 'sekme',
  semicolon: 'noktalı virgül',
  comma: 'virgül',
  space: 'boşluk / satır sonu',
};

export function RawDataForm({ onDataset }: { onDataset(dataset: Dataset | null): void }) {
  const [text, setText] = useState('');
  const [format, setFormat] = useState<TextFormat>('auto');
  const [column, setColumn] = useState<string>('');
  const [classCount, setClassCount] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const table = useMemo(() => parseText(text, format), [text, format]);
  const header = headerOf(table);
  const needsColumn = header !== null && header.length > 1;
  const selected = needsColumn && column !== '' && column !== 'all' ? Number(column) : null;
  const waiting = needsColumn && column === '';

  const { values, errors } = useMemo(
    () => (waiting ? { values: [], errors: [] } : readValues(table, selected)),
    [table, selected, waiting],
  );
  const valid = errors.length === 0 && values.length > 0;

  const suggested = valid ? sturgesClassCount(values.length) : null;
  const k = classCount === '' ? suggested : Number(classCount);
  const classification = useMemo(
    () => (valid && k !== null ? classify(values, k) : null),
    [valid, values, k],
  );
  const counts = useMemo(() => (valid ? frequencyTable(values) : []), [valid, values]);

  useEffect(() => {
    onDataset(
      valid
        ? {
            source: 'raw',
            observations: { type: 'values', values },
            classes: classification?.ok
              ? { type: 'classes', classes: classification.classes }
              : null,
          }
        : null,
    );
  }, [valid, values, classification, onDataset]);

  const replaceText = (next: string) => {
    setText(next);
    setColumn('');
  };

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    setFileError(null);
    if (file.size > MAX_FILE_BYTES) {
      setFileError('Dosya 5 MB sınırını aşıyor.');
    } else {
      try {
        replaceText(decodeCsv(await file.arrayBuffer()));
        setFileName(file.name);
      } catch {
        setFileError('Dosya okunamadı.');
      }
    }
    // Allows choosing the same file again.
    input.value = '';
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="label" htmlFor="raw-text">
          Ham veri
        </label>
        <textarea
          id="raw-text"
          className="field min-h-40 py-2 font-mono text-sm"
          value={text}
          onChange={(e) => {
            replaceText(e.target.value);
            setFileName(null);
          }}
          aria-invalid={errors.length ? true : undefined}
          placeholder={'Örnek:\n12,5; 13; 14,2'}
        />
        <p className="hint">
          Değerleri virgül, noktalı virgül, sekme veya satır sonu ile ayırın. Veriler yalnızca
          tarayıcınızda işlenir.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <span className="label">CSV dosyası yükle</span>
          <label className="btn-secondary w-full focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary">
            Dosya seç (.csv, .tsv, .txt)
            <input
              type="file"
              accept=".csv,.tsv,.txt,text/csv,text/plain"
              className="sr-only"
              onChange={upload}
            />
          </label>
          {fileName && <p className="hint">Yüklenen dosya: {fileName}</p>}
        </div>
        <div>
          <label className="label" htmlFor="raw-format">
            Sayı biçimi
          </label>
          <select
            id="raw-format"
            className="field"
            value={format}
            onChange={(e) => {
              setFormat(e.target.value as TextFormat);
              setColumn('');
            }}
          >
            <option value="auto">Otomatik algıla</option>
            <option value="tr">Türkçe (ondalık virgül, ayraç ; veya sekme)</option>
            <option value="en">Standart (ondalık nokta, ayraç virgül)</option>
          </select>
        </div>
      </div>

      {text.trim() !== '' && (
        <p className="hint">
          Algılanan ayraç: <strong>{DELIMITERS[table.delimiter]}</strong>, ondalık ayırıcı:{' '}
          <strong>{table.decimal === ',' ? 'virgül' : 'nokta'}</strong>.
        </p>
      )}

      {needsColumn && (
        <div>
          <label className="label" htmlFor="raw-column">
            Analiz edilecek sütun
          </label>
          <select
            id="raw-column"
            className="field"
            value={column}
            onChange={(e) => setColumn(e.target.value)}
          >
            <option value="">Sütun seçin…</option>
            {header.map((name, i) => (
              <option key={i} value={i}>
                {name || `Sütun ${i + 1}`}
              </option>
            ))}
            <option value="all">Tüm hücreler</option>
          </select>
        </div>
      )}

      <Messages kind="error" items={[...(fileError ? [fileError] : []), ...errors]} />
      <Messages
        kind="warning"
        items={[
          ...table.notes,
          ...(header && !needsColumn ? [`İlk satır başlık olarak atlandı: "${header[0]}".`] : []),
        ]}
      />

      {valid && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section aria-label="Frekans tablosu">
            <div className="max-h-96 overflow-auto">
              <table className="data-table">
                <caption>
                  Frekans tablosu ({counts.length.toLocaleString('tr-TR')} farklı değer)
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className="text-right">
                      xᵢ
                    </th>
                    <th scope="col" className="text-right">
                      fᵢ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {counts.slice(0, MAX_LISTED).map((row) => (
                    <tr key={row.value}>
                      <td className="num">{formatNumber(row.value)}</td>
                      <td className="num">{row.frequency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {counts.length > MAX_LISTED && (
              <p className="hint">İlk {MAX_LISTED} değer gösteriliyor.</p>
            )}
          </section>

          <section aria-label="Sınıflandırma" className="space-y-3">
            <div>
              <label className="label" htmlFor="raw-k">
                Sınıf sayısı k (sürekli dağılımlar için)
              </label>
              <input
                id="raw-k"
                type="number"
                min={2}
                max={MAX_CLASS_COUNT}
                className="field"
                value={classCount === '' ? String(suggested) : classCount}
                onChange={(e) => setClassCount(e.target.value)}
              />
              <p className="hint">
                Sturges: k = ⌈1 + 3,322 · log₁₀ N⌉ = {suggested}
                {classCount !== '' && (
                  <>
                    {' '}
                    <button
                      type="button"
                      className="cursor-pointer text-primary underline"
                      onClick={() => setClassCount('')}
                    >
                      Sturges değerine dön
                    </button>
                  </>
                )}
              </p>
            </div>
            {classification?.ok === false && (
              <Messages kind="warning" items={[classification.reason]} />
            )}
            {classification?.ok && (
              <div className="max-h-96 overflow-auto">
                <table className="data-table">
                  <caption>
                    {classification.classes.length} sınıf, genişlik h ={' '}
                    {formatNumber(classification.width)}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Sınıf</th>
                      <th scope="col" className="text-right">
                        Orta nokta
                      </th>
                      <th scope="col" className="text-right">
                        fᵢ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {classification.classes.map((c, i, all) => (
                      <tr key={c.lower}>
                        {/* ";" separates the bounds because "," is the decimal mark. */}
                        <td className="font-mono">
                          [{formatNumber(c.lower)}; {formatNumber(c.upper)}
                          {i === all.length - 1 ? ']' : ')'}
                        </td>
                        <td className="num">{formatNumber((c.lower + c.upper) / 2)}</td>
                        <td className="num">{c.frequency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {k !== null && classification.classes.length !== k && (
                  <p className="hint">
                    Verinin ölçüm hassasiyeti nedeniyle {k} yerine{' '}
                    {classification.classes.length} sınıf oluştu.
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

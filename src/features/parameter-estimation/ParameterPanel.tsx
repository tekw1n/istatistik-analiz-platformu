import { Choices } from '../../components/ui/Choices';
import { Tex } from '../../components/ui/Tex';
import { DISTRIBUTIONS, type DistributionId } from '../../distributions/catalog';
import type { Estimation } from '../../distributions/estimation/types';
import { formatNumber } from '../../utils/format';
import {
  manualValue,
  type ManualEntry,
  type Outcome,
  type ParameterMode,
  type Settings,
} from '../goodness-of-fit/analysis';

const MODES: { value: ParameterMode; label: string }[] = [
  { value: 'mle', label: 'EÇOK' },
  { value: 'mm', label: 'Momentler (M.M.)' },
  { value: 'manual', label: 'Elle giriş' },
];

function EstimationCard({
  title,
  estimation,
  selected,
}: {
  title: string;
  estimation: Estimation;
  selected: boolean;
}) {
  return (
    <article
      className={`min-w-0 rounded-md border p-4 ${selected ? 'border-2 border-primary' : 'border-line'}`}
    >
      <h3 className="flex flex-wrap items-center gap-2">
        {title}
        {selected && <span className="badge">Testte kullanılıyor</span>}
      </h3>
      {estimation.available ? (
        <>
          <div className="relative overflow-x-auto">
            <table className="data-table mt-2">
              <thead>
                <tr>
                  <th scope="col">Parametre</th>
                  <th scope="col" className="text-right">
                    Kestirim
                  </th>
                </tr>
              </thead>
              <tbody>
                {estimation.estimates.map((e) => (
                  <tr key={e.symbol}>
                    <th scope="row" className="!border-b !border-line font-normal">
                      <span className="font-semibold">{e.symbol}</span>
                      <span className="block py-1">
                        <Tex math={e.formula} />
                      </span>
                    </th>
                    <td className="num">{formatNumber(e.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-sm">
            Kestirilen parametre sayısı: <strong>m = {estimation.estimatedCount}</strong>
          </p>
          {estimation.notes.length > 0 && (
            <ul className="hint mt-2 list-disc pl-5">
              {estimation.notes.map((note) => (
                <li
                  key={note}
                  className={note.startsWith('Uyarı:') ? 'font-semibold text-warning' : undefined}
                >
                  {note}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p className="mt-2 text-sm text-warning">Hesaplanamıyor: {estimation.reason}</p>
      )}
    </article>
  );
}

/** M.M. and EÇOK side by side, manual entry, and the choice of the set used in the test. */
export function ParameterPanel({
  id,
  estimates,
  settings,
  onChange,
}: {
  id: DistributionId;
  estimates: Outcome<{ mm: Estimation; mle: Estimation }>;
  settings: Settings;
  onChange(settings: Settings): void;
}) {
  const { parameters } = DISTRIBUTIONS[id];

  const entry = (i: number): ManualEntry => settings.manual[i] ?? { estimated: false };
  const setEntry = (i: number, change: Partial<ManualEntry>) =>
    onChange({
      ...settings,
      manual: parameters.map((_, j) => (j === i ? { ...entry(j), ...change } : entry(j))),
    });

  return (
    <div className="space-y-4">
      {estimates.ok ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <EstimationCard
            title="Momentler Metodu (M.M.)"
            estimation={estimates.value.mm}
            selected={settings.mode === 'mm'}
          />
          <EstimationCard
            title="En Çok Olabilirlik (EÇOK)"
            estimation={estimates.value.mle}
            selected={settings.mode === 'mle'}
          />
        </div>
      ) : (
        <p role="alert" className="text-sm text-danger">
          {estimates.reason}
        </p>
      )}

      <Choices
        legend="Ki-Kare testinde kullanılacak parametre seti"
        options={MODES}
        value={settings.mode}
        onChange={(mode) => onChange({ ...settings, mode })}
      />

      {settings.mode === 'manual' && (
        <fieldset className="rounded-md border-2 border-primary p-4">
          <legend className="px-1 font-semibold">Elle parametre girişi</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {parameters.map((p, i) => (
              <div key={p.symbol}>
                <label className="label" htmlFor={`manual-${i}`}>
                  {p.symbol}: {p.description}
                </label>
                <input
                  id={`manual-${i}`}
                  className="field"
                  inputMode="decimal"
                  value={manualValue(id, settings, i)}
                  onChange={(e) => setEntry(i, { value: e.target.value })}
                />
                <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="size-5 accent-primary"
                    checked={entry(i).estimated}
                    onChange={(e) => setEntry(i, { estimated: e.target.checked })}
                  />
                  {p.symbol} bu veriden kestirildi
                </label>
              </div>
            ))}
          </div>
          <p className="hint">
            Veri dışından bilinen parametreler serbestlik derecesini azaltmaz (m = 0). Aynı veriden
            kestirilen her parametreyi işaretleyin.
          </p>
        </fieldset>
      )}
    </div>
  );
}

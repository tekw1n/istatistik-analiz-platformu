import type { Settings } from '../goodness-of-fit/analysis';
import { optionsFrom } from '../goodness-of-fit/analysis';

/** The known binomial number of trials. */
export function TrialsInput({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange(settings: Settings): void;
}) {
  const invalid = settings.n !== '' && optionsFrom(settings).n === undefined;
  return (
    <div className="max-w-xs">
      <label className="label" htmlFor="binomial-n">
        Binom: bilinen deneme sayısı n
      </label>
      <input
        id="binomial-n"
        className="field"
        inputMode="numeric"
        value={settings.n}
        aria-invalid={invalid || undefined}
        aria-describedby="binomial-n-hint"
        onChange={(e) => onChange({ ...settings, n: e.target.value })}
      />
      <p id="binomial-n-hint" className={invalid ? 'text-sm text-danger' : 'hint'}>
        {invalid ? 'n pozitif bir tam sayı olmalıdır.' : 'Probleme göre bilinen değeri girin.'}
      </p>
    </div>
  );
}

export function GeometricDefinitionSelect({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange(settings: Settings): void;
}) {
  return (
    <div className="max-w-md">
      <label className="label" htmlFor="geometric-definition">
        Geometrik dağılım tanımı
      </label>
      <select
        id="geometric-definition"
        className="field"
        value={settings.geometricDefinition}
        onChange={(e) =>
          onChange({
            ...settings,
            geometricDefinition: e.target.value as Settings['geometricDefinition'],
          })
        }
      >
        <option value="trials">İlk başarıya kadar deneme sayısı (X = 1, 2, …)</option>
        <option value="failures">İlk başarıya kadar başarısızlık sayısı (X = 0, 1, …)</option>
      </select>
    </div>
  );
}

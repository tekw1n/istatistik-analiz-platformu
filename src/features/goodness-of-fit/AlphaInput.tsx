import { Choices } from '../../components/ui/Choices';
import { alphaFrom, type Settings } from './analysis';

const STANDARD = ['0,01', '0,05', '0,10'];

export function AlphaInput({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange(settings: Settings): void;
}) {
  const invalid = alphaFrom(settings) === null;
  return (
    <div className="flex flex-wrap items-end gap-3">
      <Choices
        legend="Anlamlılık düzeyi α"
        options={[
          ...STANDARD.map((value) => ({ value, label: value })),
          { value: 'custom', label: 'Özel' },
        ]}
        value={settings.customAlpha ? 'custom' : settings.alpha}
        onChange={(value) =>
          onChange(
            value === 'custom'
              ? { ...settings, customAlpha: true }
              : { ...settings, customAlpha: false, alpha: value },
          )
        }
      />
      {settings.customAlpha && (
        <div>
          <label className="label" htmlFor="custom-alpha">
            Özel α (0 ile 1 arası)
          </label>
          <input
            id="custom-alpha"
            className="field max-w-32"
            inputMode="decimal"
            value={settings.alpha}
            aria-invalid={invalid || undefined}
            onChange={(e) => onChange({ ...settings, alpha: e.target.value })}
          />
        </div>
      )}
      {invalid && (
        <p role="alert" className="text-sm text-danger">
          α, 0 ile 1 arasında bir sayı olmalıdır.
        </p>
      )}
    </div>
  );
}

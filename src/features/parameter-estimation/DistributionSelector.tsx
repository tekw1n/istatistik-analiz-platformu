import { DISTRIBUTIONS, type DistributionId } from '../../distributions/catalog';
import type { Dataset } from '../data-entry/types';
import {
  incompatibility,
  INITIAL_SETTINGS,
  optionsFrom,
  type Settings,
} from '../goodness-of-fit/analysis';

const GROUPS = [
  { kind: 'discrete', title: 'Kesikli dağılımlar' },
  { kind: 'continuous', title: 'Sürekli dağılımlar' },
] as const;

/** All ten distributions; those the data do not allow are disabled with the reason. */
export function DistributionSelector({
  dataset,
  settings,
  onChange,
}: {
  dataset: Dataset;
  settings: Settings;
  onChange(settings: Settings): void;
}) {
  const options = optionsFrom(settings);
  const ids = Object.keys(DISTRIBUTIONS) as DistributionId[];
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {GROUPS.map(({ kind, title }) => (
        <fieldset key={kind} className="space-y-2">
          <legend className="label">{title}</legend>
          {ids
            .filter((id) => DISTRIBUTIONS[id].kind === kind)
            .map((id) => {
              const reason = incompatibility(id, dataset, options);
              return (
                <label
                  key={id}
                  className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-control p-3 text-sm has-checked:border-primary has-checked:bg-primary-soft has-disabled:cursor-not-allowed has-disabled:border-line has-disabled:bg-muted"
                >
                  <input
                    type="radio"
                    name="distribution"
                    className="mt-0.5 size-4 accent-primary"
                    checked={settings.distribution === id}
                    disabled={reason !== null}
                    // Manual values and calculator bounds belong to the previous distribution.
                    onChange={() =>
                      onChange({
                        ...settings,
                        distribution: id,
                        manual: [],
                        calculator: INITIAL_SETTINGS.calculator,
                      })
                    }
                  />
                  <span>
                    <span className="font-semibold">{DISTRIBUTIONS[id].name}</span>
                    {reason && <span className="block text-ink-soft">{reason}</span>}
                  </span>
                </label>
              );
            })}
        </fieldset>
      ))}
    </div>
  );
}

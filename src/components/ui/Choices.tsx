import { useId } from 'react';

/** A radio group shown as a row of options. */
export function Choices<T extends string>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: readonly { value: T; label: string }[];
  value: NoInfer<T>;
  onChange: (value: NoInfer<T>) => void;
}) {
  const name = useId();
  return (
    <fieldset>
      <legend className="label">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-control bg-surface px-3 text-sm has-checked:border-primary has-checked:bg-primary-soft has-checked:font-semibold"
          >
            <input
              type="radio"
              className="size-4 accent-primary"
              name={name}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

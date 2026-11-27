import type { ReactNode } from 'react';

/** Colours come from the design tokens in index.css. */
export const COLORS = {
  observed: 'var(--color-observed)',
  model: 'var(--color-model)',
  muted: 'var(--color-line)',
  grid: 'var(--color-muted)',
  ink: 'var(--color-ink-soft)',
};

export const AXIS_TICK = { fill: COLORS.ink, fontSize: 12 };

export function TooltipBox({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2 text-sm shadow-md">
      <p className="font-semibold">{title}</p>
      <dl className="tabular-nums">
        {rows.map(([term, value]) => (
          <div key={term} className="flex justify-between gap-4">
            <dt className="text-ink-soft">{term}</dt>
            <dd className="font-mono">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** A legend in text colour; the swatch beside each label carries the series identity. */
export function Legend({ items }: { items: { label: string; swatch: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <span aria-hidden="true" className={`inline-block w-4 rounded-xs ${item.swatch}`} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export function Figure({
  title,
  description,
  children,
}: {
  title: string;
  /** What the chart shows and where the same numbers can be read as text. */
  description: string;
  children: ReactNode;
}) {
  return (
    <figure className="space-y-2">
      <figcaption>
        <span className="block font-semibold">{title}</span>
        <span className="hint">{description}</span>
      </figcaption>
      {children}
    </figure>
  );
}

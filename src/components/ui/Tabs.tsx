import type { KeyboardEvent, ReactNode } from 'react';

interface Props<T extends string> {
  label: string;
  /** Prefix of the tab and panel ids. */
  name: string;
  tabs: readonly { id: T; label: string }[];
  active: NoInfer<T>;
  // A property rather than a method, so that a narrower setter is accepted only for the right ids.
  onSelect: (id: NoInfer<T>) => void;
}

/** A tab list with arrow, Home and End key navigation. Pair it with `TabPanel`. */
export function Tabs<T extends string>({ label, name, tabs, active, onSelect }: Props<T>) {
  const move = (event: KeyboardEvent) => {
    const index = tabs.findIndex((t) => t.id === active);
    const target: Record<string, number> = {
      ArrowRight: (index + 1) % tabs.length,
      ArrowLeft: (index - 1 + tabs.length) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    };
    const position = target[event.key];
    if (position === undefined) return;
    event.preventDefault();
    const next = tabs[position]!;
    onSelect(next.id);
    document.getElementById(`${name}-tab-${next.id}`)?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex flex-wrap border-b border-line print:hidden"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          id={`${name}-tab-${tab.id}`}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          aria-controls={`${name}-panel-${tab.id}`}
          tabIndex={active === tab.id ? 0 : -1}
          className="min-h-11 cursor-pointer border-b-3 border-transparent px-4 text-sm font-medium text-ink-soft hover:text-ink aria-selected:border-primary aria-selected:text-primary"
          onClick={() => onSelect(tab.id)}
          onKeyDown={move}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function TabPanel({
  name,
  id,
  active,
  children,
}: {
  name: string;
  id: string;
  active: string;
  children: ReactNode;
}) {
  return (
    <div
      role="tabpanel"
      id={`${name}-panel-${id}`}
      aria-labelledby={`${name}-tab-${id}`}
      hidden={active !== id}
    >
      {children}
    </div>
  );
}

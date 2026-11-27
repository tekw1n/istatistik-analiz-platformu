import type { ReactNode } from 'react';

/** A scrolling box that can also be reached and scrolled with the keyboard. */
export function ScrollArea({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className="relative max-h-[32rem] overflow-auto print:max-h-none print:overflow-visible"
    >
      {children}
    </div>
  );
}

import type { ReactNode } from 'react';

/** Says why there is nothing to show and what to do next. */
export function EmptyState({
  title,
  children,
  action,
  tone = 'neutral',
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  tone?: 'neutral' | 'error';
}) {
  const colors =
    tone === 'error' ? 'border-danger bg-danger-soft' : 'border-control bg-surface';
  return (
    <div className={`space-y-2 rounded-md border border-dashed p-5 text-center ${colors}`}>
      <p className={`font-semibold ${tone === 'error' ? 'text-danger' : ''}`}>{title}</p>
      <p className="mx-auto max-w-prose text-sm text-ink-soft">{children}</p>
      {action}
    </div>
  );
}

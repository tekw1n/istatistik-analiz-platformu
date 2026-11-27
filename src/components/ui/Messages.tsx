const STYLES = {
  error: { box: 'border-danger bg-danger-soft text-danger', title: 'Düzeltilmesi gerekenler' },
  warning: { box: 'border-warning bg-warning-soft text-warning', title: 'Uyarı' },
};

/** A titled list of errors or warnings, announced to screen readers when it changes. */
export function Messages({ kind, items }: { kind: keyof typeof STYLES; items: string[] }) {
  const { box, title } = STYLES[kind];
  return (
    <div aria-live="polite">
      {items.length > 0 && (
        <div className={`rounded-md border-l-4 p-3 text-sm ${box}`}>
          <p className="font-semibold">{title}</p>
          <ul className="list-disc pl-5">
            {items.slice(0, 20).map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
          {items.length > 20 && <p>… ve {items.length - 20} ileti daha.</p>}
        </div>
      )}
    </div>
  );
}

import {
  Fragment,
  useEffect,
  useId,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import type { CellError } from '../types';

export interface Column<R> {
  field: keyof R & string;
  label: string;
  inputMode?: 'numeric' | 'decimal';
  /** Disabled cells show this text instead of their value. */
  disabledText?: (row: number, rowCount: number) => string | null;
}

interface Props<R> {
  caption: string;
  columns: Column<R>[];
  rows: R[];
  errors: CellError[];
  onChange(rows: R[]): void;
  /** A new row to append. */
  emptyRow(previous: R | undefined): R;
  /** Handles a multi-cell paste starting at the given row. */
  onPasteText(text: string, row: number): void;
  /** Read-only column computed from a row, shown before the last column. */
  derived?: { label: string; value(row: R, index: number): string };
  total: number;
  /** Table controls shown beside "add row". */
  toolbar?: ReactNode;
}

export function EditableTable<R extends object>({
  caption,
  columns,
  rows,
  errors,
  onChange,
  emptyRow,
  onPasteText,
  derived,
  total,
  toolbar,
}: Props<R>) {
  const id = useId();
  // An empty cell is not reported until the user has left it.
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());

  const paste = (event: ClipboardEvent, row: number) => {
    const text = event.clipboardData.getData('text');
    if (!/[\t\n]/.test(text.trim())) return;
    event.preventDefault();
    onPasteText(text, row);
  };

  // The cell to focus once the rows have been rendered again.
  const pending = useRef<string | null>(null);
  useEffect(() => {
    if (pending.current === null) return;
    document.getElementById(pending.current)?.focus();
    pending.current = null;
  });

  const cellId = (row: number, field: string) => `${id}-cell-${row}-${field}`;
  /** The first column of a row that can be typed in. */
  const firstField = (row: number, count: number) =>
    (columns.find((c) => !c.disabledText?.(row, count)) ?? columns[0]!).field;

  const addRow = (field?: string) => {
    const count = rows.length + 1;
    pending.current = cellId(rows.length, field ?? firstField(rows.length, count));
    onChange([...rows, emptyRow(rows[rows.length - 1])]);
  };

  // Enter moves down a column (adding a row after the last one), Shift+Enter moves up.
  const move = (event: KeyboardEvent, row: number, field: string) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const next = row + (event.shiftKey ? -1 : 1);
    if (next === rows.length) addRow(field);
    else if (next >= 0) document.getElementById(cellId(next, field))?.focus();
  };

  const set = (row: number, field: keyof R, value: string) =>
    onChange(rows.map((r, i) => (i === row ? { ...r, [field]: value } : r)));

  const last = columns.length - 1;
  const span = columns.length - 1 + (derived ? 1 : 0);

  return (
    <div className="space-y-3">
      <div className="relative overflow-x-auto">
        <table className="data-table">
          <caption>{caption}</caption>
          <thead>
            <tr>
              <th scope="col" className="w-10">
                #
              </th>
              {columns.map((column, c) => (
                <Fragment key={column.field}>
                  {derived && c === last && (
                    <th scope="col" className="text-right">
                      {derived.label}
                    </th>
                  )}
                  <th scope="col">{column.label}</th>
                </Fragment>
              ))}
              <th scope="col">
                <span className="sr-only">İşlem</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td className="num pt-4 text-ink-soft">{i + 1}</td>
                {columns.map((column, c) => {
                  const disabled = column.disabledText?.(i, rows.length) ?? null;
                  const value = row[column.field] as string;
                  const key = `${i}-${column.field}`;
                  const error = errors.find(
                    (e) => e.row === i && e.field === column.field,
                  )?.message;
                  const shown = error && (value !== '' || touched.has(key)) ? error : null;
                  const errorId = `${id}-${key}-error`;
                  return (
                    <Fragment key={column.field}>
                      {derived && c === last && (
                        <td className="num pt-4">{derived.value(row, i)}</td>
                      )}
                      <td className="min-w-20">
                        <input
                          id={cellId(i, column.field)}
                          className="field num"
                          type="text"
                          inputMode={column.inputMode}
                          aria-label={`${column.label}, satır ${i + 1}`}
                          aria-invalid={shown ? true : undefined}
                          aria-describedby={shown ? errorId : undefined}
                          disabled={disabled !== null}
                          value={disabled ?? value}
                          onChange={(e) => set(i, column.field, e.target.value)}
                          onBlur={() => setTouched((t) => new Set(t).add(key))}
                          onPaste={(e) => paste(e, i)}
                          onKeyDown={(e) => move(e, i, column.field)}
                        />
                        {shown && (
                          <p id={errorId} className="mt-1 text-xs text-danger">
                            {shown}
                          </p>
                        )}
                      </td>
                    </Fragment>
                  );
                })}
                <td className="w-16">
                  <button
                    type="button"
                    className="btn-quiet"
                    aria-label={`Satır ${i + 1} sil`}
                    disabled={rows.length === 1}
                    onClick={() => {
                      setTouched(new Set());
                      // The focused button disappears, so focus moves to the row taking its place.
                      const row = Math.min(i, rows.length - 2);
                      pending.current = cellId(row, firstField(row, rows.length - 1));
                      onChange(rows.filter((_, j) => j !== i));
                    }}
                  >
                    Sil
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={span + 1} className="text-right">
                N = Σ fᵢ
              </td>
              <td className="num pr-5">{total.toLocaleString('tr-TR')}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <div
        role="group"
        aria-label="Tablo araçları"
        className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-md border border-line bg-muted p-3"
      >
        <button type="button" className="btn-secondary" onClick={() => addRow()}>
          Satır ekle
        </button>
        {toolbar}
      </div>
      <p className="hint">
        Excel’den kopyaladığınız hücreleri herhangi bir kutuya yapıştırabilirsiniz; tablo o satırdan
        itibaren yenilenir. Enter alttaki hücreye geçer, Shift + Enter üsttekine.
      </p>
    </div>
  );
}

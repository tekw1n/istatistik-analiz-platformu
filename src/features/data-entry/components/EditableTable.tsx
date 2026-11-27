import { Fragment, useId, useState, type ClipboardEvent } from 'react';
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
      <button
        type="button"
        className="btn-secondary"
        onClick={() => onChange([...rows, emptyRow(rows[rows.length - 1])])}
      >
        Satır ekle
      </button>
      <p className="hint">
        Excel’den kopyaladığınız hücreleri herhangi bir kutuya yapıştırabilirsiniz; tablo o satırdan
        itibaren yenilenir.
      </p>
    </div>
  );
}

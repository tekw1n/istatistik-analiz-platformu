import type { Observations } from '../../distributions/estimation/types';
import { formatNumber } from '../../utils/format';
import { frequencyTable } from '../data-entry/rawData';

const MAX_ROWS = 200;

/** The data of the analysis as a read-only table. Raw values are shown as their frequencies. */
export function DataTable({ observations }: { observations: Observations }) {
  let head: string[];
  let rows: string[][];
  let total: number;

  if (observations.type === 'classes') {
    head = ['Alt sınır', 'Üst sınır', 'Orta nokta', 'fᵢ'];
    rows = observations.classes.map(({ lower, upper, frequency }) => [
      formatNumber(lower),
      formatNumber(upper),
      Number.isFinite(lower + upper) ? formatNumber((lower + upper) / 2) : '—',
      formatNumber(frequency),
    ]);
    total = observations.classes.reduce((sum, c) => sum + c.frequency, 0);
  } else {
    const { values, frequencies, openTail } = observations;
    const counted = frequencies
      ? values.map((value, i) => ({ value, frequency: frequencies[i]! }))
      : frequencyTable(values);
    head = ['xᵢ', 'fᵢ'];
    rows = counted.map((r) => [formatNumber(r.value), formatNumber(r.frequency)]);
    total = counted.reduce((sum, r) => sum + r.frequency, 0);
    if (openTail) {
      rows.push([`X ≥ ${formatNumber(openTail.from)}`, formatNumber(openTail.frequency)]);
      total += openTail.frequency;
    }
  }

  return (
    <div className="space-y-1">
      <table className="data-table tabular-nums">
        <thead>
          <tr>
            {head.map((title, c) => (
              <th key={title} scope="col" className={c === 0 ? undefined : '!text-right'}>
                {title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, MAX_ROWS).map((cells, i) => (
            <tr key={i}>
              {cells.map((cell, c) => (
                <td key={c} className={c === 0 ? 'font-mono' : 'num'}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={head.length - 1}>
              N = Σ fᵢ
            </td>
            <td className="num">{formatNumber(total)}</td>
          </tr>
        </tfoot>
      </table>
      {rows.length > MAX_ROWS && (
        <p className="hint">
          {formatNumber(rows.length)} satırın ilk {MAX_ROWS} tanesi gösterilmektedir; N bütün
          veriyi kapsar.
        </p>
      )}
    </div>
  );
}

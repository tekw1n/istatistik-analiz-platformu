import { isSmall } from '../../chiSquare/merging';
import type { ChiSquareClass, ChiSquareRow, MergeRule, MergeStep } from '../../chiSquare/types';
import { ScrollArea } from '../../components/ui/ScrollArea';
import type { Distribution } from '../../distributions/distributionTypes';
import { formatNumber } from '../../utils/format';
import { classLabel } from './classLabel';

const MAX_ROWS = 500;

const RULES: Record<MergeRule, string> = {
  'lower-tail': 'Alt kuyruk',
  'upper-tail': 'Üst kuyruk',
  interior: 'Ara sınıf',
};

const total = (rows: readonly ChiSquareRow[], key: 'observed' | 'probability' | 'expected') =>
  rows.reduce((sum, row) => sum + row[key], 0);

const sameRange = (a: ChiSquareClass, b: ChiSquareClass) =>
  a.lower === b.lower && a.upper === b.upper;

export function ClassTable({
  caption,
  kind,
  rows,
  /** Raw table: marks classes with E < 5. */
  markSmall = false,
  /** Merged table: rows that are not in this table were created by merging. */
  originals,
}: {
  caption: string;
  kind: Distribution['kind'];
  rows: ChiSquareRow[];
  markSmall?: boolean;
  originals?: ChiSquareRow[];
}) {
  // The statistic is the sum over the final classes; a total of the raw table would mislead.
  const statistic =
    !markSmall && rows.every((r) => r.contribution !== null)
      ? rows.reduce((sum, r) => sum + r.contribution!, 0)
      : null;
  return (
    <div className="space-y-1">
      <ScrollArea label={caption}>
        <table className="data-table tabular-nums">
          <caption>{caption}</caption>
          <thead>
            <tr>
              <th scope="col">Sınıf</th>
              {['Oᵢ', 'pᵢ', 'Eᵢ', '(Oᵢ − Eᵢ)² / Eᵢ'].map((head) => (
                <th key={head} scope="col" className="text-right">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, MAX_ROWS).map((row) => {
              const small = markSmall && isSmall(row);
              const merged = originals && !originals.some((o) => sameRange(o, row));
              return (
                <tr
                  key={row.lower}
                  className={small ? 'bg-warning-soft' : merged ? 'bg-primary-soft' : undefined}
                >
                  <td className={small ? 'border-l-4 !border-l-warning' : undefined}>
                    <span className="font-mono whitespace-nowrap">{classLabel(kind, row)}</span>
                    {/* Text, not only colour, says why a row is marked. */}
                    {small && <span className="badge badge-warning ml-2">Eᵢ &lt; 5</span>}
                    {merged && <span className="badge ml-2">birleştirildi</span>}
                  </td>
                  <td className="num">{formatNumber(row.observed)}</td>
                  <td className="num">{formatNumber(row.probability)}</td>
                  <td className={`num ${small ? 'font-bold text-warning' : ''}`}>
                    {formatNumber(row.expected, 4)}
                  </td>
                  <td className="num">
                    {row.contribution === null ? 'Tanımsız' : formatNumber(row.contribution, 4)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td>Toplam ({rows.length} sınıf)</td>
              <td className="num">{formatNumber(total(rows, 'observed'))}</td>
              <td className="num">{formatNumber(total(rows, 'probability'))}</td>
              <td className="num">{formatNumber(total(rows, 'expected'), 4)}</td>
              <td className="num">{statistic === null ? '—' : `χ² = ${formatNumber(statistic, 4)}`}</td>
            </tr>
          </tfoot>
        </table>
      </ScrollArea>
      {rows.length > MAX_ROWS && (
        <p className="hint">
          İlk {MAX_ROWS} sınıf gösteriliyor; toplamlar bütün sınıfları kapsar.
        </p>
      )}
    </div>
  );
}

export function MergeHistory({
  kind,
  history,
  expanded = false,
}: {
  kind: Distribution['kind'];
  history: MergeStep[];
  /** Opens a long history too (printed report). */
  expanded?: boolean;
}) {
  const describe = (c: ChiSquareClass) => (
    <>
      <span className="font-mono">{classLabel(kind, c)}</span>
      <span className="block text-ink-soft">
        O = {formatNumber(c.observed)}, E = {formatNumber(c.expected, 4)}
      </span>
    </>
  );
  if (history.length === 0) {
    return <p className="text-sm">Tüm sınıflarda Eᵢ ≥ 5; birleştirme yapılmadı.</p>;
  }
  return (
    <details open={expanded || history.length <= 15}>
      <summary className="min-h-11 cursor-pointer py-2 font-semibold">
        Birleştirme geçmişi ({history.length} adım)
      </summary>
      <ScrollArea label="Birleştirme geçmişi">
        <table className="data-table tabular-nums">
          <thead>
            <tr>
              <th scope="col">Adım</th>
              <th scope="col">Kural</th>
              <th scope="col">Sol sınıf</th>
              <th scope="col">Sağ sınıf</th>
              <th scope="col">Birleşik sınıf</th>
            </tr>
          </thead>
          <tbody>
            {history.slice(0, MAX_ROWS).map((step, i) => (
              <tr key={i}>
                <td className="num">{i + 1}</td>
                <td>{RULES[step.rule]}</td>
                <td>{describe(step.merged[0])}</td>
                <td>{describe(step.merged[1])}</td>
                <td className="bg-primary-soft">{describe(step.result)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>
      {history.length > MAX_ROWS && <p className="hint">İlk {MAX_ROWS} adım gösteriliyor.</p>}
    </details>
  );
}

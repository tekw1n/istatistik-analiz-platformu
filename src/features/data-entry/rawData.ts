import { parseNumber } from './numbers';
import { headerOf, type ParsedTable } from './parseText';

export const MAX_VALUES = 100_000;

export interface RawValues {
  values: number[];
  errors: string[];
}

/**
 * The numbers of one column, or of every cell when `column` is null.
 * Nothing is skipped silently: each non-numeric cell is reported.
 */
export function readValues(table: ParsedTable, column: number | null): RawValues {
  const rows = headerOf(table) ? table.rows.slice(1) : table.rows;
  const values: number[] = [];
  const errors: string[] = [];
  for (const { line, cells } of rows) {
    const selected = column === null ? cells : [cells[column] ?? ''];
    for (const cell of selected) {
      if (cell === '') continue;
      const value = parseNumber(cell, table.decimal);
      if (value === null) errors.push(`Satır ${line}: "${cell}" sayı olarak okunamadı.`);
      else values.push(value);
    }
  }
  if (values.length > MAX_VALUES) {
    errors.push(`En fazla ${MAX_VALUES.toLocaleString('tr-TR')} gözlem desteklenir.`);
  }
  return { values, errors };
}

/** Distinct values in ascending order with their counts. */
export function frequencyTable(values: readonly number[]): { value: number; frequency: number }[] {
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts]
    .sort(([a], [b]) => a - b)
    .map(([value, frequency]) => ({ value, frequency }));
}

/** CSV files written by Turkish Excel are often Windows-1254 rather than UTF-8. */
export function decodeCsv(bytes: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1254').decode(bytes);
  }
}

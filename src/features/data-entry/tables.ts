import type { Observations } from '../../distributions/estimation/types';
import { parseCell } from './numbers';
import { headerOf, parseText } from './parseText';
import type { CellError } from './types';
import { formatNumber } from '../../utils/format';

export interface FrequencyRow {
  x: string;
  f: string;
}

export interface ClassRow {
  lower: string;
  upper: string;
  f: string;
}

export interface TableResult<T> {
  errors: CellError[];
  /** Problems of the table as a whole. */
  problems: string[];
  warnings: string[];
  /** N over the rows with a valid frequency. */
  total: number;
  /** Null while there is any error. */
  observations: T | null;
}

const MAX_FILLED_ROWS = 1000;
const isFrequency = (v: number | null): v is number =>
  v !== null && Number.isSafeInteger(v) && v >= 0;

function frequencyError(text: string): string | null {
  if (text.trim() === '') return 'Frekans girin.';
  return isFrequency(parseCell(text)) ? null : 'Frekans negatif olmayan tam sayı olmalıdır.';
}

/** Discrete frequency table. Blank rows are ignored; `openLast` makes the last row X >= x. */
export function readFrequencyTable(
  rows: readonly FrequencyRow[],
  openLast: boolean,
): TableResult<Extract<Observations, { type: 'values' }>> {
  const errors: CellError[] = [];
  const problems: string[] = [];
  const warnings: string[] = [];
  const values: number[] = [];
  const frequencies: number[] = [];
  let total = 0;
  let previous: number | null = null;
  let gaps = false;

  rows.forEach(({ x, f }, row) => {
    if (x.trim() === '' && f.trim() === '') return;
    const value = parseCell(x);
    if (value === null || !Number.isSafeInteger(value)) {
      errors.push({
        row,
        field: 'x',
        message: x.trim() === '' ? 'x değerini girin.' : 'x tam sayı olmalıdır.',
      });
    } else {
      if (previous !== null && value === previous) {
        errors.push({ row, field: 'x', message: `${formatNumber(value)} değeri tekrar ediyor.` });
      } else if (previous !== null && value < previous) {
        errors.push({ row, field: 'x', message: 'x değerleri küçükten büyüğe sıralanmalıdır.' });
      } else if (previous !== null && value > previous + 1) {
        gaps = true;
      }
      previous = value;
    }
    const message = frequencyError(f);
    if (message) errors.push({ row, field: 'f', message });
    else total += parseCell(f)!;
    values.push(value ?? NaN);
    frequencies.push(parseCell(f) ?? 0);
  });

  if (values.length === 0) problems.push('En az bir satır girin.');
  else if (total === 0 && errors.length === 0) problems.push('Toplam frekans sıfır olamaz.');
  if (gaps) {
    warnings.push('Arada eksik tam sayı değerleri var; testte frekansları 0 kabul edilir.');
  }

  let observations: Extract<Observations, { type: 'values' }> | null = null;
  if (errors.length === 0 && problems.length === 0) {
    if (openLast) {
      const from = values.pop()!;
      const frequency = frequencies.pop()!;
      observations = { type: 'values', values, frequencies, openTail: { from, frequency } };
    } else {
      observations = { type: 'values', values, frequencies };
    }
  }
  return { errors, problems, warnings, total, observations };
}

/** Rows in ascending order of x; blank rows are dropped. */
export function sortRows(rows: readonly FrequencyRow[]): FrequencyRow[] {
  // Rows that could not be read stay at the end, so nothing the user typed is lost.
  const key = (row: FrequencyRow) => parseCell(row.x) ?? Infinity;
  return rows
    .filter((row) => row.x.trim() !== '' || row.f.trim() !== '')
    .sort((a, b) => (key(a) === key(b) ? 0 : key(a) - key(b)));
}

/** Sorted rows with every missing integer added with frequency 0. */
export function fillMissingCategories(rows: readonly FrequencyRow[]): FrequencyRow[] {
  const filled: FrequencyRow[] = [];
  let before: number | null = null;
  for (const row of sortRows(rows)) {
    const value = parseCell(row.x);
    if (before !== null && value !== null && value - before - 1 <= MAX_FILLED_ROWS) {
      for (let k = before + 1; k < value; k++) filled.push({ x: String(k), f: '0' });
    }
    filled.push(row);
    before = value;
  }
  return filled;
}

/** Grouped continuous table with adjacent classes; the end classes may be open. */
export function readClassTable(
  rows: readonly ClassRow[],
  openFirst: boolean,
  openLast: boolean,
): TableResult<Extract<Observations, { type: 'classes' }>> {
  const errors: CellError[] = [];
  const problems: string[] = [];
  const filled = rows
    .map((row, index) => ({ ...row, index }))
    .filter((r) => r.lower.trim() !== '' || r.upper.trim() !== '' || r.f.trim() !== '');
  let total = 0;
  let previousUpper: number | null = null;

  const classes = filled.map((r, i) => {
    const row = r.index;
    const bound = (field: 'lower' | 'upper', open: boolean): number | null => {
      if (open) return field === 'lower' ? -Infinity : Infinity;
      const value = parseCell(r[field]);
      if (value === null) {
        const name = field === 'lower' ? 'Alt sınır' : 'Üst sınır';
        errors.push({
          row,
          field,
          message: r[field].trim() === '' ? `${name} girin.` : `${name} sayı olmalıdır.`,
        });
      }
      return value;
    };
    const lower = bound('lower', openFirst && i === 0);
    const upper = bound('upper', openLast && i === filled.length - 1);

    if (lower !== null && upper !== null && !(lower < upper)) {
      errors.push({ row, field: 'upper', message: 'Üst sınır alt sınırdan büyük olmalıdır.' });
    }
    if (lower !== null && previousUpper !== null && lower !== previousUpper) {
      errors.push({
        row,
        field: 'lower',
        message:
          lower > previousUpper
            ? `Önceki sınıfla arada boşluk var; alt sınır ${formatNumber(previousUpper)} olmalıdır.`
            : `Önceki sınıfla çakışıyor; alt sınır ${formatNumber(previousUpper)} olmalıdır.`,
      });
    }
    previousUpper = upper;

    const message = frequencyError(r.f);
    if (message) errors.push({ row, field: 'f', message });
    else total += parseCell(r.f)!;
    return { lower: lower!, upper: upper!, frequency: parseCell(r.f) ?? 0 };
  });

  if (classes.length < 2) problems.push('En az iki sınıf girin.');
  else if (total === 0 && errors.length === 0) problems.push('Toplam frekans sıfır olamaz.');

  const valid = errors.length === 0 && problems.length === 0;
  return {
    errors,
    problems,
    warnings: [],
    total,
    observations: valid ? { type: 'classes', classes } : null,
  };
}

export type Pasted<T> = { rows: T[] } | { error: string };

/** Splits spreadsheet text into data rows; a header row without numbers is dropped. */
function pastedCells(text: string): string[][] {
  const table = parseText(text);
  const rows = headerOf(table) ? table.rows.slice(1) : table.rows;
  return rows.map((r) => r.cells);
}

export function pasteFrequencyRows(text: string): Pasted<FrequencyRow> {
  const cells = pastedCells(text);
  if (cells.length === 0 || cells.some((c) => c.length !== 2)) {
    return { error: 'Yapıştırılan her satırda iki sütun (xᵢ, fᵢ) bulunmalıdır.' };
  }
  return { rows: cells.map(([x, f]) => ({ x: x!, f: f! })) };
}

const OPEN_MARK = /^([-−+]?(∞|inf))?$/i;

/** Accepts (lower, upper, f) or (lower, upper, midpoint, f); an empty or ∞ end bound is open. */
export function pasteClassRows(
  text: string,
): Pasted<ClassRow> & { openFirst?: boolean; openLast?: boolean } {
  const cells = pastedCells(text);
  if (cells.length === 0 || cells.some((c) => c.length !== 3 && c.length !== 4)) {
    return {
      error:
        'Yapıştırılan her satırda alt sınır, üst sınır ve frekans (isteğe bağlı orta nokta) bulunmalıdır.',
    };
  }
  const rows = cells.map((c) => ({ lower: c[0]!, upper: c[1]!, f: c[c.length - 1]! }));
  const openFirst = OPEN_MARK.test(rows[0]!.lower);
  const openLast = OPEN_MARK.test(rows[rows.length - 1]!.upper);
  if (openFirst) rows[0]!.lower = '';
  if (openLast) rows[rows.length - 1]!.upper = '';
  return { rows, openFirst, openLast };
}

import { parseNumber, type DecimalMark } from './numbers';

/** 'tr': decimal comma, values separated by ; tab or space. 'en': decimal dot, comma also separates. */
export type TextFormat = 'auto' | 'tr' | 'en';

export interface ParsedTable {
  rows: { line: number; cells: string[] }[];
  delimiter: 'tab' | 'semicolon' | 'comma' | 'space';
  decimal: DecimalMark;
  /** How an ambiguous text was read, in Turkish. */
  notes: string[];
}

const SEPARATORS = { tab: '\t', semicolon: ';', comma: ',' } as const;

/** Splits one line, honouring double-quoted fields. */
function splitLine(line: string, separator: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i]!;
    if (quoted) {
      if (char !== '"') cell += char;
      else if (line[i + 1] === '"') cell += line[++i];
      else quoted = false;
    } else if (char === '"' && cell.trim() === '') {
      quoted = true;
      cell = '';
    } else if (char === separator) {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += char;
    }
  }
  cells.push(cell.trim());
  return cells;
}

/**
 * Decides what separates the values and what the decimal mark is.
 * Order: tab, then semicolon (Turkish CSV), then the comma, which is read as a decimal mark
 * only when every token containing it looks like a single decimal number.
 */
function detect(text: string, format: TextFormat): Omit<ParsedTable, 'rows'> {
  const notes: string[] = [];
  const delimiter = text.includes('\t') ? 'tab' : text.includes(';') ? 'semicolon' : null;

  if (format === 'tr') return { delimiter: delimiter ?? 'space', decimal: ',', notes };
  if (format === 'en') {
    return { delimiter: delimiter ?? (text.includes(',') ? 'comma' : 'space'), decimal: '.', notes };
  }
  if (delimiter) {
    const decimal = /\d,\d/.test(text) ? ',' : '.';
    if (decimal === ',' && /\d\.\d{3}(?!\d)/.test(text)) {
      notes.push('Virgül ondalık, nokta binlik ayırıcı olarak yorumlandı.');
    }
    return { delimiter, decimal, notes };
  }
  const withComma = text.split(/\s+/).filter((token) => token.includes(','));
  if (withComma.length === 0) return { delimiter: 'space', decimal: '.', notes };
  if (!/\d\.\d/.test(text) && withComma.every((t) => /^[+-−]?\d+,\d+$/.test(t))) {
    notes.push(
      'Virgül ondalık ayırıcı olarak yorumlandı (örnek: "1,5" tek bir sayıdır). Virgül değerleri ayırıyorsa biçimi "Standart" seçin.',
    );
    return { delimiter: 'space', decimal: ',', notes };
  }
  return { delimiter: 'comma', decimal: '.', notes };
}

export function parseText(text: string, format: TextFormat = 'auto'): ParsedTable {
  const clean = text.replace(/^﻿/, '');
  const detected = detect(clean, format);
  const { delimiter, decimal } = detected;

  const rows = clean.split(/\r\n|\r|\n/).flatMap((content, index) => {
    if (content.trim() === '') return [];
    let cells: string[];
    if (delimiter === 'space') {
      cells = content.trim().split(/\s+/);
    } else {
      cells = splitLine(content, SEPARATORS[delimiter]).flatMap((cell) => {
        // "1 2 3" inside a cell is a list of numbers; header names keep their spaces.
        const parts = cell.split(/\s+/);
        const isList = parts.length > 1 && parts.every((p) => parseNumber(p, decimal) !== null);
        return isList ? parts : [cell];
      });
    }
    return [{ line: index + 1, cells }];
  });

  return { ...detected, rows };
}

/** Column names when the first row holds no number at all, otherwise null. */
export function headerOf({ rows, decimal }: ParsedTable): string[] | null {
  const first = rows[0]?.cells;
  if (!first || rows.length < 2) return null;
  const filled = first.filter((cell) => cell !== '');
  return filled.length > 0 && filled.every((cell) => parseNumber(cell, decimal) === null)
    ? first
    : null;
}

import { describe, expect, it } from 'vitest';
import { parseCell, parseNumber } from '../../src/features/data-entry/numbers';
import { headerOf, parseText, type TextFormat } from '../../src/features/data-entry/parseText';
import { decodeCsv, frequencyTable, readValues } from '../../src/features/data-entry/rawData';

const values = (text: string, format?: TextFormat, column: number | null = null) => {
  const result = readValues(parseText(text, format), column);
  expect(result.errors).toEqual([]);
  return result.values;
};

describe('parseNumber', () => {
  it.each<[string, number]>([
    ['12', 12],
    ['-0.5', -0.5],
    ['.5', 0.5],
    ['+3', 3],
    ['1e-3', 0.001],
    ['−2', -2],
  ])('dot notation: %s', (text, expected) => {
    expect(parseNumber(text, '.')).toBe(expected);
  });

  it.each<[string, number]>([
    ['1,5', 1.5],
    ['-0,25', -0.25],
    ['1.234,5', 1234.5],
    ['1.234.567', 1234567],
    ['7', 7],
  ])('comma notation: %s', (text, expected) => {
    expect(parseNumber(text, ',')).toBe(expected);
  });

  it.each([
    ['abc', '.'],
    ['', '.'],
    ['1,5', '.'],
    ['1.5', ','],
    ['12.34,5', ','],
    ['1,2,3', ','],
    ['0x10', '.'],
    ['Infinity', '.'],
    ['1e999', '.'],
  ] as const)('rejects %s with decimal "%s"', (text, mark) => {
    expect(parseNumber(text, mark)).toBeNull();
  });

  it('reads a table cell in either notation', () => {
    expect(parseCell('2,5')).toBe(2.5);
    expect(parseCell('2.5')).toBe(2.5);
    expect(parseCell('2,5.1')).toBeNull();
  });
});

describe('delimiters and decimal mark', () => {
  it('reads a Turkish Excel CSV (semicolon and decimal comma)', () => {
    expect(values('12,5;13;14,25\n9,0;8;7,5')).toEqual([12.5, 13, 14.25, 9, 8, 7.5]);
  });

  it('reads a standard CSV (comma and decimal dot)', () => {
    expect(values('12.5,13,14.25\n9.0,8,7.5')).toEqual([12.5, 13, 14.25, 9, 8, 7.5]);
  });

  it('reads comma separated integers', () => {
    expect(values('1,2,3,4')).toEqual([1, 2, 3, 4]);
    expect(values('1, 2, 3')).toEqual([1, 2, 3]);
  });

  it('reads tab separated text with decimal commas', () => {
    expect(values('1,5\t2,5\n3\t4,25')).toEqual([1.5, 2.5, 3, 4.25]);
  });

  it('reads one decimal-comma number per line and says so', () => {
    const table = parseText('1,5\n2,75\n3');
    expect(table.notes.join(' ')).toContain('ondalık');
    expect(readValues(table, null).values).toEqual([1.5, 2.75, 3]);
  });

  it('lets the user override the ambiguous case', () => {
    expect(values('1,5\n2,7', 'en')).toEqual([1, 5, 2, 7]);
    expect(values('1,5 2,7', 'tr')).toEqual([1.5, 2.7]);
    expect(values('1.234; 2', 'tr')).toEqual([1234, 2]);
    expect(values('1.234; 2')).toEqual([1.234, 2]);
  });

  it('handles quoted fields, a byte order mark, Windows line ends and trailing delimiters', () => {
    expect(values('﻿"1,5";"2";\r\n3;4;\r\n\r\n')).toEqual([1.5, 2, 3, 4]);
    expect(values('"1.5","2"\n3,4')).toEqual([1.5, 2, 3, 4]);
  });

  it('accepts a list of numbers inside one delimited cell', () => {
    expect(values('1 2;3')).toEqual([1, 2, 3]);
  });
});

describe('columns and errors', () => {
  const turkish = 'Öğrenci No;Boy (cm)\n1;170,5\n2;165\n';

  it('finds the header and reads the chosen column', () => {
    expect(headerOf(parseText(turkish))).toEqual(['Öğrenci No', 'Boy (cm)']);
    expect(values(turkish, 'auto', 1)).toEqual([170.5, 165]);
  });

  it('does not confuse a two-column standard CSV with decimal commas', () => {
    expect(values('id,value\n1,5\n2,7', 'auto', 1)).toEqual([5, 7]);
  });

  it('does not take a numeric first row as a header', () => {
    expect(headerOf(parseText('1;2\n3;4'))).toBeNull();
  });

  it('reports every non-numeric cell with its line', () => {
    const { errors } = readValues(parseText('1;2\nüç;4\n5;?'), null);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toContain('Satır 2');
    expect(errors[0]).toContain('üç');
  });

  it('rejects mixed decimal marks', () => {
    expect(readValues(parseText('1,5;2.5'), null).errors).toHaveLength(1);
  });

  it('counts repeated values', () => {
    expect(frequencyTable([3, 1, 3, 3])).toEqual([
      { value: 1, frequency: 1 },
      { value: 3, frequency: 3 },
    ]);
  });

  it('decodes UTF-8 and Windows-1254 files', () => {
    expect(decodeCsv(new TextEncoder().encode('Boy;Ağırlık').buffer)).toBe('Boy;Ağırlık');
    // "Ağ" in Windows-1254: ğ = 0xF0
    expect(decodeCsv(new Uint8Array([0x41, 0xf0]).buffer)).toBe('Ağ');
  });
});

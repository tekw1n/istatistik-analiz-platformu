import { describe, expect, it } from 'vitest';
import { formatNumber, texNumber } from '../../src/utils/format';

describe('formatNumber', () => {
  it.each<[number, string]>([
    [0, '0'],
    [-0, '0'],
    [0.05, '0,05'],
    [1.5, '1,5'],
    [-2.25, '-2,25'],
    [1234567.5, '1.234.567,5'],
    [1 / 3, '0,333333'],
    [Infinity, '∞'],
    [-Infinity, '−∞'],
    [0.0001, '0,0001'],
    [0.0000123456, '1,2346 × 10⁻⁵'],
    [-3e-12, '-3 × 10⁻¹²'],
    [2.5e20, '2,5 × 10²⁰'],
  ])('%s → %s', (value, expected) => {
    expect(formatNumber(value)).toBe(expected);
  });

  it('limits the decimals', () => {
    expect(formatNumber(3.841458820694, 4)).toBe('3,8415');
    expect(formatNumber(0.00012, 4)).toBe('0,0001');
  });

  it('writes the same notation for LaTeX', () => {
    expect(texNumber(0.05)).toBe('0{,}05');
    expect(texNumber(1234.5)).toBe('1{.}234{,}5');
    expect(texNumber(1.5e-7)).toBe('1{,}5\\times 10^{-7}');
    expect(texNumber(Infinity)).toBe('\\infty');
  });
});

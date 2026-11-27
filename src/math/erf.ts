import { regularizedGammaP, regularizedGammaQ } from './gamma';

/** Error function, through erf(x) = sign(x) · P(1/2, x²). */
export function erf(x: number): number {
  if (Number.isNaN(x)) throw new RangeError('erf: x is NaN');
  // x² would underflow; the first Taylor term is exact to double precision here.
  if (Math.abs(x) < 1e-8) return (2 / Math.sqrt(Math.PI)) * x;
  return Math.sign(x) * regularizedGammaP(0.5, x * x);
}

/** Complementary error function 1 - erf(x), accurate in the upper tail. */
export function erfc(x: number): number {
  if (Number.isNaN(x)) throw new RangeError('erfc: x is NaN');
  if (Math.abs(x) < 1e-8) return 1 - erf(x);
  return x > 0 ? regularizedGammaQ(0.5, x * x) : 1 + regularizedGammaP(0.5, x * x);
}

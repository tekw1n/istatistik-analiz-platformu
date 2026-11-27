import { inverseRegularizedGammaQ, regularizedGammaQ } from '../math/gamma';
import type { ChiSquareClass, ChiSquareRow } from './types';

/** Adds (O - E)² / E to every class. */
export function withContributions(classes: readonly ChiSquareClass[]): ChiSquareRow[] {
  return classes.map((c) => {
    let contribution: number | null;
    if (c.expected > 0) contribution = (c.observed - c.expected) ** 2 / c.expected;
    else contribution = c.observed === 0 ? 0 : null;
    return { ...c, contribution };
  });
}

/** sd = k' - 1 - m */
export function degreesOfFreedom(classCount: number, estimatedCount: number): number {
  return classCount - 1 - estimatedCount;
}

/** P(χ²_df >= statistic) = Q(df/2, statistic/2) */
export function chiSquarePValue(statistic: number, df: number): number {
  return regularizedGammaQ(df / 2, statistic / 2);
}

/** The value exceeded with probability alpha: F⁻¹(1 - alpha). */
export function chiSquareCriticalValue(df: number, alpha: number): number {
  return 2 * inverseRegularizedGammaQ(df / 2, alpha);
}

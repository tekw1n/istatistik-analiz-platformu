import type { SupportOptions } from '../catalog';

/** One class of grouped continuous data. The first lower and last upper bound may be infinite. */
export interface DataClass {
  lower: number;
  upper: number;
  frequency: number;
}

export type Observations =
  /** Raw data, or a discrete frequency table when `frequencies` is given. */
  | {
      type: 'values';
      values: number[];
      frequencies?: number[];
      /** Discrete open-ended class X >= from. */
      openTail?: { from: number; frequency: number };
    }
  /** Grouped continuous data. */
  | { type: 'classes'; classes: DataClass[] };

export type EstimationOptions = SupportOptions;

export interface Estimate {
  symbol: string;
  value: number;
  /** LaTeX */
  formula: string;
}

export type Method = 'mm' | 'mle';

/** What an estimator computes; `reason` explains in Turkish why it cannot. */
export type Fit =
  | {
      available: true;
      /** Parameter values in the order of the distribution catalog. */
      params: number[];
      /** What to show: the estimates with their formulas, including derived ones such as σ². */
      estimates: Estimate[];
      notes: string[];
    }
  | { available: false; reason: string };

export type Estimation = { method: Method } & (
  | (Extract<Fit, { available: true }> & {
      /** m: the number of parameters estimated from the data. */
      estimatedCount: number;
      /** The χ² reference distribution holds only approximately for these estimates. */
      pValueApproximate: boolean;
    })
  | Extract<Fit, { available: false }>
);

export const unavailable = (reason: string): Fit => ({ available: false, reason });

export const fitted = (estimates: Estimate[], params: number[], notes: string[] = []): Fit => ({
  available: true,
  estimates,
  params,
  notes,
});

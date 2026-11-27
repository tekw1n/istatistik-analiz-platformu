import type { Estimation } from '../distributions/estimation/types';

/**
 * Parameters to test: an available M.M. or EÇOK estimation, or the result of manual entry.
 */
export type FittedModel = Pick<
  Extract<Estimation, { available: true }>,
  'params' | 'estimatedCount' | 'pValueApproximate' | 'pValueNote' | 'approximateIfMerged'
>;

/**
 * One class of the test. A discrete class holds the integers lower..upper (both included);
 * a continuous class is the interval between the bounds. Bounds may be infinite.
 */
export interface ChiSquareClass {
  lower: number;
  upper: number;
  /** O */
  observed: number;
  /** p = P(X in class) */
  probability: number;
  /** E = N p */
  expected: number;
}

export interface ChiSquareRow extends ChiSquareClass {
  /** (O - E)² / E. Null when E = 0 while O > 0. */
  contribution: number | null;
}

export type MergeRule = 'lower-tail' | 'upper-tail' | 'interior';

export interface MergeStep {
  rule: MergeRule;
  /** The two adjacent classes that were merged, left one first. */
  merged: [ChiSquareClass, ChiSquareClass];
  result: ChiSquareClass;
}

interface Tables {
  /** N */
  total: number;
  alpha: number;
  rawRows: ChiSquareRow[];
  mergedRows: ChiSquareRow[];
  history: MergeStep[];
  /** m */
  estimatedCount: number;
  pValueApproximate: boolean;
  notes: string[];
}

export type ChiSquareResult = Tables &
  (
    | {
        status: 'ok';
        /** sd = k' - 1 - m */
        degreesOfFreedom: number;
        statistic: number;
        pValue: number;
        criticalValue: number;
        rejectNull: boolean;
        conclusion: string;
      }
    /** The model gives probability 0 to a class that was observed. */
    | { status: 'impossible'; reason: string }
    | {
        status: 'insufficient-df';
        degreesOfFreedom: number;
        statistic: number;
        reason: string;
      }
  );

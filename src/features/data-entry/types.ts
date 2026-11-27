import type { Observations } from '../../distributions/estimation/types';

/** What the data entry step hands to the analysis. */
export interface Dataset {
  source: 'frequency' | 'grouped' | 'raw';
  /** Observations used for estimation. */
  observations: Observations;
  /** Classes of raw data, used to test continuous distributions. Null when they cannot be built. */
  classes: Extract<Observations, { type: 'classes' }> | null;
}

/** A problem in one table cell. `row` is zero based. */
export interface CellError {
  row: number;
  field: string;
  message: string;
}

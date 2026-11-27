import type { ChiSquareClass, MergeRule, MergeStep } from './types';

export const MINIMUM_EXPECTED = 5;
// Rounding must not turn an exact 5 into "below 5", or break a tie between equal E values.
const ROUNDING = 1e-9;

const isSmall = (c: ChiSquareClass) => c.expected < MINIMUM_EXPECTED - ROUNDING;

function combine(a: ChiSquareClass, b: ChiSquareClass): ChiSquareClass {
  return {
    lower: a.lower,
    upper: b.upper,
    observed: a.observed + b.observed,
    probability: a.probability + b.probability,
    expected: a.expected + b.expected,
  };
}

/** Index of the left class of the next pair to merge, or null when nothing is left to do. */
function nextMerge(classes: readonly ChiSquareClass[]): [number, MergeRule] | null {
  const end = classes.length - 1;
  if (end < 1) return null;
  if (isSmall(classes[0]!)) return [0, 'lower-tail'];
  if (isSmall(classes[end]!)) return [end - 1, 'upper-tail'];
  const i = classes.findIndex(isSmall);
  if (i < 0) return null;
  // The neighbour with the smaller E; the left one on a tie.
  const left = classes[i - 1]!.expected;
  const right = classes[i + 1]!.expected;
  return [right < left - ROUNDING ? i : i - 1, 'interior'];
}

/**
 * Merges adjacent classes until every E >= 5 or one class remains:
 * first the lower tail, then the upper tail, then interior classes from the left.
 */
export function mergeClasses(input: readonly ChiSquareClass[]): {
  classes: ChiSquareClass[];
  history: MergeStep[];
} {
  const classes = [...input];
  const history: MergeStep[] = [];
  // Each step removes one class, so the loop ends after at most input.length - 1 steps.
  for (let next = nextMerge(classes); next; next = nextMerge(classes)) {
    const [i, rule] = next;
    const merged: [ChiSquareClass, ChiSquareClass] = [classes[i]!, classes[i + 1]!];
    const result = combine(...merged);
    classes.splice(i, 2, result);
    history.push({ rule, merged, result });
  }
  return { classes, history };
}

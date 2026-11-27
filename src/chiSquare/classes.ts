import { DISTRIBUTIONS, type DistributionId } from '../distributions/catalog';
import { intervalProbability } from '../distributions/createDistribution';
import type { Distribution } from '../distributions/distributionTypes';
import { closeTails } from '../distributions/estimation/observations';
import type { DataClass, Observations } from '../distributions/estimation/types';
import type { ChiSquareClass } from './types';

const MAX_CLASSES = 10_000;

/**
 * One class per integer from the lowest to the highest relevant value, with missing
 * categories filled with frequency 0. An unbounded upper tail is closed into the last class.
 */
function discreteClasses(
  distribution: Distribution,
  data: Extract<Observations, { type: 'values' }>,
): DataClass[] {
  const counts = new Map<number, number>();
  data.values.forEach((value, i) => {
    const frequency = data.frequencies?.[i] ?? 1;
    if (frequency > 0) counts.set(value, (counts.get(value) ?? 0) + frequency);
  });
  const { openTail } = data;
  const observed = [...counts.keys()];
  if (openTail) observed.push(openTail.from);

  const { min, max } = distribution.support;
  const first = observed.reduce((a, b) => Math.min(a, b), min);
  // The last class starts at `last`.
  const last = openTail
    ? openTail.from
    : observed.reduce((a, b) => Math.max(a, b), Number.isFinite(max) ? max : first);
  if (last - first + 1 > MAX_CLASSES) {
    throw new RangeError(
      `Test için ${MAX_CLASSES} sınıftan fazlası gerekiyor; verinin değer aralığı çok geniş.`,
    );
  }

  const classes: DataClass[] = [];
  for (let k = first; k <= last; k++) {
    classes.push({ lower: k, upper: k, frequency: counts.get(k) ?? 0 });
  }
  const tail = classes[classes.length - 1]!;
  tail.upper = Number.isFinite(max) ? Math.max(max, last) : Infinity;
  if (openTail) tail.frequency = openTail.frequency;
  return classes;
}

/** Classes covering the whole support, with their probabilities and expected frequencies. */
export function expectedClasses(
  id: DistributionId,
  distribution: Distribution,
  data: Observations,
): { total: number; classes: ChiSquareClass[] } {
  let source: DataClass[];
  if (distribution.kind === 'discrete') {
    // validateObservations has already rejected classed data for discrete distributions.
    source = discreteClasses(distribution, data as Extract<Observations, { type: 'values' }>);
  } else {
    if (data.type !== 'classes') {
      throw new RangeError(
        `${DISTRIBUTIONS[id].name} süreklidir; ki-kare testi için veri önce sınıflandırılmalıdır.`,
      );
    }
    source = closeTails(data.classes);
  }

  const total = source.reduce((sum, c) => sum + c.frequency, 0);
  const classes = source.map(({ lower, upper, frequency }) => {
    const probability = intervalProbability(distribution, lower, upper);
    return { lower, upper, observed: frequency, probability, expected: total * probability };
  });

  const sum = classes.reduce((s, c) => s + c.probability, 0);
  if (Math.abs(sum - 1) > 1e-8) {
    throw new Error(`class probabilities sum to ${sum} instead of 1`);
  }
  return { total, classes };
}

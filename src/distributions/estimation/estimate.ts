import { describe } from '../../math/statistics';
import { DISTRIBUTIONS, type DistributionId } from '../catalog';
import type { Distribution } from '../distributionTypes';
import { groupedMaximumLikelihood } from './groupedLikelihood';
import { maximumLikelihood } from './maximumLikelihood';
import { momentEstimates } from './moments';
import { closeTails, validateObservations } from './observations';
import {
  unavailable,
  type DataClass,
  type Estimation,
  type EstimationOptions,
  type Fit,
  type Method,
  type Observations,
} from './types';

const APPROXIMATE_P_VALUE =
  'p-değeri yaklaşıktır: parametreler sınıf frekansları yerine gözlem değerlerinden kestirildi (Chernoff–Lehmann).';
const MIDPOINTS =
  'Sınıf orta noktaları kullanıldı; momentler ve kestirimler yaklaşıktır.';
const OPEN_CLASS_MOMENTS =
  'Açık uçlu sınıfın orta noktası ve gözlem değerleri bilinmediğinden momentler (x̄, m₂) hesaplanamaz.';

/** Discrete data with an open tail only keeps the class frequencies of the tail. */
const OPEN_TAIL_MODELS: DistributionId[] = ['poisson', 'geometric', 'binomial'];

/**
 * 'always': estimated from something other than the class frequencies.
 * 'ifMerged': maximum likelihood on the class frequencies, exact only while the classes stay as they are.
 */
type Approximation = 'always' | 'ifMerged';

function finish(
  id: DistributionId,
  method: Method,
  fit: Fit,
  approximation: Approximation,
): Estimation {
  if (!fit.available) return { method, ...fit };
  return {
    method,
    ...fit,
    // The binomial n is known.
    estimatedCount: DISTRIBUTIONS[id].parameters.length - (id === 'binomial' ? 1 : 0),
    pValueApproximate: approximation === 'always',
    approximateIfMerged: approximation === 'ifMerged',
    notes: approximation === 'always' ? [...fit.notes, APPROXIMATE_P_VALUE] : fit.notes,
  };
}

/** Method of moments and maximum likelihood estimates for the given data. */
export function estimateParameters(
  id: DistributionId,
  data: Observations,
  options: EstimationOptions = {},
): { mm: Estimation; mle: Estimation } {
  validateObservations(id, data, options);

  if (data.type === 'classes') {
    const { classes } = data;
    let mm: Fit;
    if (classes.some((c) => !Number.isFinite(c.lower) || !Number.isFinite(c.upper))) {
      mm = unavailable(OPEN_CLASS_MOMENTS);
    } else {
      const statistics = describe(
        classes.map((c) => (c.lower + c.upper) / 2),
        classes.map((c) => c.frequency),
      );
      mm = momentEstimates(id, statistics, options);
      if (mm.available) mm = { ...mm, notes: [...mm.notes, MIDPOINTS] };
    }
    return {
      mm: finish(id, 'mm', mm, 'always'),
      mle: finish(
        id,
        'mle',
        groupedMaximumLikelihood(id, closeTails(classes), options),
        'ifMerged',
      ),
    };
  }

  const { values, openTail } = data;
  const frequencies = data.frequencies ?? values.map(() => 1);

  if (openTail && openTail.frequency > 0) {
    const classes: DataClass[] = values.map((v, i) => ({
      lower: v,
      upper: v,
      frequency: frequencies[i]!,
    }));
    classes.push({ lower: openTail.from, upper: Infinity, frequency: openTail.frequency });
    const mle = OPEN_TAIL_MODELS.includes(id)
      ? groupedMaximumLikelihood(id, classes, options)
      : unavailable('Bu dağılım için açık uçlu sınıfla kestirim desteklenmiyor.');
    return {
      mm: finish(id, 'mm', unavailable(OPEN_CLASS_MOMENTS), 'always'),
      mle: finish(id, 'mle', mle, 'ifMerged'),
    };
  }

  const statistics = describe(values, frequencies);
  return {
    mm: finish(id, 'mm', momentEstimates(id, statistics, options), 'always'),
    // For a discrete distribution the exact values are the classes of the test.
    mle: finish(
      id,
      'mle',
      maximumLikelihood(id, values, frequencies, statistics, options),
      DISTRIBUTIONS[id].kind === 'discrete' ? 'ifMerged' : 'always',
    ),
  };
}

export interface ManualParameter {
  value: number;
  /** True when the value was estimated from the data being tested, even if typed by hand. */
  estimatedFromData: boolean;
}

/** Mode B: parameters typed by the user, in the order of the distribution catalog. */
export function manualParameters(
  id: DistributionId,
  entries: readonly ManualParameter[],
  options: EstimationOptions = {},
): {
  distribution: Distribution;
  params: number[];
  estimatedCount: number;
  pValueApproximate: boolean;
  approximateIfMerged: boolean;
} {
  const { name, parameters, create } = DISTRIBUTIONS[id];
  if (entries.length !== parameters.length) {
    throw new RangeError(`${name} için ${parameters.length} parametre girilmelidir.`);
  }
  const params = entries.map((e) => e.value);
  const estimatedCount = entries.filter((e) => e.estimatedFromData).length;
  return {
    distribution: create(params, options),
    params,
    estimatedCount,
    // How the typed values were estimated is unknown.
    pValueApproximate: estimatedCount > 0,
    approximateIfMerged: false,
  };
}

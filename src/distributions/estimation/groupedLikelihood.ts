import { maximize } from '../../math/optimization';
import { describe } from '../../math/statistics';
import { DISTRIBUTIONS, type DistributionId } from '../catalog';
import { intervalProbability } from '../createDistribution';
import { sigmaEstimates } from './moments';
import { fitted, unavailable, type DataClass, type EstimationOptions, type Fit } from './types';

const FORMULA =
  '\\max_\\theta\\; \\ell(\\theta)=\\sum_i f_i\\ln P_i(\\theta)';
const NOTE =
  'Sınıf olasılıkları üzerinden ℓ(θ) = Σ fᵢ ln Pᵢ(θ) sayısal olarak (Nelder–Mead) maksimize edildi; sınıf orta noktaları gözlem sayılmadı.';
const NO_MAXIMUM = 'Sayısal en çok olabilirlik hesabı sonlu bir çözüme yakınsamadı.';

/** Maps an unconstrained search point (starting at the origin) to parameter values. */
interface Search {
  dimension: number;
  parameters(u: number[]): number[];
}

const logistic = (x: number) => 1 / (1 + Math.exp(-x));
const logit = (p: number) => Math.log(p / (1 - p));

function search(
  id: DistributionId,
  classes: readonly DataClass[],
  options: EstimationOptions,
): Search {
  const { min: supportMin } = DISTRIBUTIONS[id].dataSupport(options);
  const widths = classes.map((c) => c.upper - c.lower).filter(Number.isFinite);
  const width = widths.length ? widths.reduce((a, b) => a + b, 0) / widths.length : 1;

  // Rough representative points, used only to start the search.
  const points = classes.map(({ lower, upper }) => {
    const lo = Math.max(lower, id === 'normal' || id === 'continuousUniform' ? lower : supportMin);
    if (lo === -Infinity) return upper - width / 2;
    return upper === Infinity ? lo + width / 2 : (lo + upper) / 2;
  });
  const frequencies = classes.map((c) => c.frequency);
  const rough = describe(points, frequencies);

  switch (id) {
    case 'poisson':
    case 'exponential': {
      const start = id === 'poisson' ? Math.max(rough.mean, 0.5) : 1 / rough.mean;
      return { dimension: 1, parameters: ([u]) => [start * Math.exp(u!)] };
    }
    case 'binomial': {
      const n = options.n!;
      const start = logit(Math.min(Math.max(rough.mean / n, 0.01), 0.99));
      return { dimension: 1, parameters: ([u]) => [n, logistic(start + u!)] };
    }
    case 'geometric': {
      const mean = rough.mean + (options.geometricDefinition === 'failures' ? 1 : 0);
      const start = logit(Math.min(Math.max(1 / mean, 0.01), 0.99));
      return { dimension: 1, parameters: ([u]) => [logistic(start + u!)] };
    }
    case 'normal':
    case 'logNormal': {
      const s =
        id === 'normal' ? rough : describe(points.map(Math.log), frequencies);
      const sd = Math.sqrt(s.momentVariance);
      return { dimension: 2, parameters: ([u, v]) => [s.mean + sd * u!, sd * Math.exp(v!)] };
    }
    case 'gamma': {
      // Shape and mean are nearly independent, which is far easier to search than shape and scale.
      const shape = rough.mean ** 2 / rough.momentVariance;
      return {
        dimension: 2,
        parameters: ([u, v]) => {
          const alpha = shape * Math.exp(u!);
          return [alpha, (rough.mean * Math.exp(v! / Math.sqrt(shape))) / alpha];
        },
      };
    }
    case 'continuousUniform': {
      const occupied = points.filter((_, i) => frequencies[i]! > 0);
      const a = occupied[0]!;
      const b = occupied[occupied.length - 1]!;
      return { dimension: 2, parameters: ([u, v]) => [a + width * u!, b + width * v!] };
    }
    default:
      throw new Error(`no grouped likelihood for ${id}`);
  }
}

/**
 * Maximum likelihood from class frequencies. Bounds are those of `intervalProbability`,
 * so a discrete open tail X >= k is the class [k, ∞).
 */
export function groupedMaximumLikelihood(
  id: DistributionId,
  classes: readonly DataClass[],
  options: EstimationOptions,
): Fit {
  const { create, parameters, dataSupport } = DISTRIBUTIONS[id];
  const occupied = classes.filter((c) => c.frequency > 0);

  const { dimension, parameters: toParameters } = search(id, classes, options);
  if (dimension === 2 && occupied.length < 3) {
    return unavailable(
      'İki parametreli gruplandırılmış EÇOK için gözlem içeren en az 3 sınıf gerekir.',
    );
  }
  // One parameter: all observations in an end class push the estimate to a boundary.
  if (dimension === 1 && occupied.length === 1) {
    const { lower, upper } = occupied[0]!;
    if (upper === Infinity || lower <= dataSupport(options).min) {
      return unavailable(
        'Tüm gözlemler tek bir uç sınıfta olduğundan sonlu bir EÇOK çözümü yoktur.',
      );
    }
  }

  const logLikelihood = (u: number[]): number => {
    try {
      const distribution = create(toParameters(u), options);
      return occupied.reduce(
        (sum, c) =>
          sum + c.frequency * Math.log(intervalProbability(distribution, c.lower, c.upper)),
        0,
      );
    } catch (error) {
      // Parameter values outside their domain are simply not candidates.
      if (error instanceof RangeError) return -Infinity;
      throw error;
    }
  };

  let params: number[];
  try {
    params = toParameters(maximize(logLikelihood, new Array<number>(dimension).fill(0)));
  } catch {
    return unavailable(NO_MAXIMUM);
  }

  // The binomial n is known, so it is not reported as an estimate.
  const estimates = params.flatMap((value, i) => {
    const { symbol } = parameters[i]!;
    if (symbol === 'n') return [];
    if (symbol === 'σ') return sigmaEstimates(value * value, FORMULA);
    return [{ symbol, value, formula: FORMULA }];
  });
  return fitted(estimates, params, [NOTE]);
}

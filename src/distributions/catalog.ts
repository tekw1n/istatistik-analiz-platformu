import { isInSupport } from './createDistribution';
import type { GeometricDefinition } from './discrete/geometric';
import type { Distribution, Support } from './distributionTypes';

export type DistributionId =
  | 'binomial'
  | 'poisson'
  | 'discreteUniform'
  | 'geometric'
  | 'bernoulli'
  | 'normal'
  | 'exponential'
  | 'continuousUniform'
  | 'gamma'
  | 'logNormal';

/** Known quantities that change which data a distribution can describe. */
export interface SupportOptions {
  /** Binomial number of trials. */
  n?: number;
  geometricDefinition?: GeometricDefinition;
}

export interface ParameterDescription {
  symbol: string;
  description: string;
}

export interface DistributionInfo {
  name: string;
  kind: Distribution['kind'];
  /** In the order the factory function takes them. */
  parameters: ParameterDescription[];
  /** Values an observation may take, whatever the parameter values are. */
  dataSupport(options: SupportOptions): Support;
}

const integers = (min: number, max = Infinity): Support => ({ min, max, integer: true });
const reals = (min = -Infinity, minExclusive = false): Support => ({
  min,
  max: Infinity,
  integer: false,
  minExclusive,
});

export const DISTRIBUTIONS: Record<DistributionId, DistributionInfo> = {
  binomial: {
    name: 'Binom',
    kind: 'discrete',
    parameters: [
      { symbol: 'n', description: 'Deneme sayısı (bilinen)' },
      { symbol: 'p', description: 'Başarı olasılığı' },
    ],
    dataSupport: ({ n }) => integers(0, n),
  },
  poisson: {
    name: 'Poisson',
    kind: 'discrete',
    parameters: [{ symbol: 'λ', description: 'Birim başına ortalama olay sayısı' }],
    dataSupport: () => integers(0),
  },
  discreteUniform: {
    name: 'Kesikli Düzgün',
    kind: 'discrete',
    parameters: [
      { symbol: 'a', description: 'En küçük değer' },
      { symbol: 'b', description: 'En büyük değer' },
    ],
    dataSupport: () => integers(-Infinity),
  },
  geometric: {
    name: 'Geometrik',
    kind: 'discrete',
    parameters: [{ symbol: 'p', description: 'Başarı olasılığı' }],
    dataSupport: ({ geometricDefinition }) =>
      integers(geometricDefinition === 'failures' ? 0 : 1),
  },
  bernoulli: {
    name: 'Bernoulli',
    kind: 'discrete',
    parameters: [{ symbol: 'p', description: 'Başarı olasılığı' }],
    dataSupport: () => integers(0, 1),
  },
  normal: {
    name: 'Normal',
    kind: 'continuous',
    parameters: [
      { symbol: 'μ', description: 'Ortalama' },
      { symbol: 'σ', description: 'Standart sapma' },
    ],
    dataSupport: () => reals(),
  },
  exponential: {
    name: 'Üstel',
    kind: 'continuous',
    parameters: [{ symbol: 'λ', description: 'Hız (ortalama = 1/λ)' }],
    dataSupport: () => reals(0),
  },
  continuousUniform: {
    name: 'Sürekli Düzgün',
    kind: 'continuous',
    parameters: [
      { symbol: 'a', description: 'Alt sınır' },
      { symbol: 'b', description: 'Üst sınır' },
    ],
    dataSupport: () => reals(),
  },
  gamma: {
    name: 'Gamma',
    kind: 'continuous',
    parameters: [
      { symbol: 'α', description: 'Şekil' },
      { symbol: 'θ', description: 'Ölçek (ortalama = αθ)' },
    ],
    dataSupport: () => reals(0, true),
  },
  logNormal: {
    name: 'Log-Normal',
    kind: 'continuous',
    parameters: [
      { symbol: 'μ', description: 'ln X değerlerinin ortalaması' },
      { symbol: 'σ', description: 'ln X değerlerinin standart sapması' },
    ],
    dataSupport: () => reals(0, true),
  },
};

function describeSupport({ min, max, integer, minExclusive }: Support): string {
  const type = integer ? 'tam sayı' : 'gerçel sayı';
  if (min === -Infinity) return `herhangi bir ${type}`;
  if (max !== Infinity) return `${min} ile ${max} arasında ${type}`;
  return minExclusive ? `${min} değerinden büyük ${type}` : `en az ${min} olan ${type}`;
}

/**
 * Checks raw observations or discrete categories against the support of a distribution.
 * Returns null when every value fits, otherwise the reason in Turkish.
 */
export function checkData(
  id: DistributionId,
  values: readonly number[],
  options: SupportOptions = {},
): string | null {
  const { name, dataSupport } = DISTRIBUTIONS[id];
  const support = dataSupport(options);
  const invalid = values.find((value) => !isInSupport(support, value));
  if (invalid === undefined) return null;
  return `${name} dağılımı bu veriye uygulanamaz: her gözlem ${describeSupport(support)} olmalıdır, ancak veride ${invalid} değeri var.`;
}

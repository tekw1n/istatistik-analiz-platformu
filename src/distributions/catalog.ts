import { continuousUniform } from './continuous/continuousUniform';
import { exponential } from './continuous/exponential';
import { gammaDistribution } from './continuous/gammaDistribution';
import { logNormal } from './continuous/logNormal';
import { normal } from './continuous/normal';
import { isInSupport } from './createDistribution';
import { bernoulli } from './discrete/bernoulli';
import { binomial } from './discrete/binomial';
import { discreteUniform } from './discrete/discreteUniform';
import { geometric, type GeometricDefinition } from './discrete/geometric';
import { poisson } from './discrete/poisson';
import type { Distribution, Support } from './distributionTypes';
import { formatNumber } from '../utils/format';

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
  /** `values` follow the order of `parameters`. Invalid values throw. */
  create(values: readonly number[], options?: SupportOptions): Distribution;
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
    create: ([n, p]) => binomial(n!, p!),
  },
  poisson: {
    name: 'Poisson',
    kind: 'discrete',
    parameters: [{ symbol: 'λ', description: 'Birim başına ortalama olay sayısı' }],
    dataSupport: () => integers(0),
    create: ([lambda]) => poisson(lambda!),
  },
  discreteUniform: {
    name: 'Kesikli Düzgün',
    kind: 'discrete',
    parameters: [
      { symbol: 'a', description: 'En küçük değer' },
      { symbol: 'b', description: 'En büyük değer' },
    ],
    dataSupport: () => integers(-Infinity),
    create: ([a, b]) => discreteUniform(a!, b!),
  },
  geometric: {
    name: 'Geometrik',
    kind: 'discrete',
    parameters: [{ symbol: 'p', description: 'Başarı olasılığı' }],
    dataSupport: ({ geometricDefinition }) =>
      integers(geometricDefinition === 'failures' ? 0 : 1),
    create: ([p], options) => geometric(p!, options?.geometricDefinition),
  },
  bernoulli: {
    name: 'Bernoulli',
    kind: 'discrete',
    parameters: [{ symbol: 'p', description: 'Başarı olasılığı' }],
    dataSupport: () => integers(0, 1),
    create: ([p]) => bernoulli(p!),
  },
  normal: {
    name: 'Normal',
    kind: 'continuous',
    parameters: [
      { symbol: 'μ', description: 'Ortalama' },
      { symbol: 'σ', description: 'Standart sapma' },
    ],
    dataSupport: () => reals(),
    create: ([mu, sigma]) => normal(mu!, sigma!),
  },
  exponential: {
    name: 'Üstel',
    kind: 'continuous',
    parameters: [{ symbol: 'λ', description: 'Hız (ortalama = 1/λ)' }],
    dataSupport: () => reals(0),
    create: ([lambda]) => exponential(lambda!),
  },
  continuousUniform: {
    name: 'Sürekli Düzgün',
    kind: 'continuous',
    parameters: [
      { symbol: 'a', description: 'Alt sınır' },
      { symbol: 'b', description: 'Üst sınır' },
    ],
    dataSupport: () => reals(),
    create: ([a, b]) => continuousUniform(a!, b!),
  },
  gamma: {
    name: 'Gamma',
    kind: 'continuous',
    parameters: [
      { symbol: 'α', description: 'Şekil' },
      { symbol: 'θ', description: 'Ölçek (ortalama = αθ)' },
    ],
    dataSupport: () => reals(0, true),
    create: ([alpha, theta]) => gammaDistribution(alpha!, theta!),
  },
  logNormal: {
    name: 'Log-Normal',
    kind: 'continuous',
    parameters: [
      { symbol: 'μ', description: 'ln X değerlerinin ortalaması' },
      { symbol: 'σ', description: 'ln X değerlerinin standart sapması' },
    ],
    dataSupport: () => reals(0, true),
    create: ([mu, sigma]) => logNormal(mu!, sigma!),
  },
};

function describeSupport({ min, max, integer, minExclusive }: Support): string {
  const type = integer ? 'tam sayı' : 'gerçel sayı';
  if (min === -Infinity) return `herhangi bir ${type}`;
  if (max !== Infinity) return `${formatNumber(min)} ile ${formatNumber(max)} arasında ${type}`;
  const bound = formatNumber(min);
  return minExclusive ? `${bound} değerinden büyük ${type}` : `en az ${bound} olan ${type}`;
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
  return `${name} dağılımı bu veriye uygulanamaz: her gözlem ${describeSupport(support)} olmalıdır, ancak veride ${formatNumber(invalid)} değeri var.`;
}

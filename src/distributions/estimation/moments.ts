import type { DescriptiveStatistics } from '../../math/statistics';
import type { DistributionId } from '../catalog';
import { fitted, unavailable, type EstimationOptions, type Fit } from './types';
import { formatNumber } from '../../utils/format';

const NO_SPREAD = 'Gözlemlerin tümü aynı (m₂ = 0) olduğundan bu parametreler kestirilemez.';
const M2_NOTE =
  "Her iki yöntemde de σ̂² hesabında N'e bölünen m₂ kullanılır (N−1'e bölünen s² değil).";

/** σ̂ and σ̂² of the normal and log-normal estimates, shown together. */
export function sigmaEstimates(variance: number, formula: string) {
  return [
    { symbol: 'σ', value: Math.sqrt(variance), formula: `\\hat\\sigma=\\sqrt{\\hat\\sigma^2}` },
    { symbol: 'σ²', value: variance, formula },
  ];
}

export { M2_NOTE, NO_SPREAD };

/** Method of moments from the mean and the moment variance m2 (divisor N). */
export function momentEstimates(
  id: DistributionId,
  { mean, momentVariance: m2, min, max }: DescriptiveStatistics,
  options: EstimationOptions,
): Fit {
  switch (id) {
    case 'binomial': {
      const n = options.n!;
      const p = mean / n;
      return fitted([{ symbol: 'p', value: p, formula: '\\hat p=\\bar x/n' }], [n, p]);
    }
    case 'bernoulli':
      return fitted([{ symbol: 'p', value: mean, formula: '\\hat p=\\bar x' }], [mean]);
    case 'poisson':
      if (mean <= 0) return unavailable('Ortalama 0 olduğundan λ > 0 kestirilemez.');
      return fitted([{ symbol: 'λ', value: mean, formula: '\\hat\\lambda=\\bar x' }], [mean]);
    case 'geometric': {
      const failures = options.geometricDefinition === 'failures';
      const p = 1 / (failures ? 1 + mean : mean);
      const formula = failures ? '\\hat p=1/(1+\\bar x)' : '\\hat p=1/\\bar x';
      return fitted([{ symbol: 'p', value: p, formula }], [p]);
    }
    case 'discreteUniform': {
      // Var(X) = ((b - a + 1)² - 1) / 12
      const half = (Math.sqrt(12 * m2 + 1) - 1) / 2;
      const a = mean - half;
      const b = mean + half;
      const rounded = [Math.round(a), Math.round(b)];
      const notes = [
        `Ham sonuç tam sayı olmayabilir; testte en yakın tam sayılar kullanılır: a = ${formatNumber(rounded[0]!)}, b = ${formatNumber(rounded[1]!)}.`,
      ];
      if (rounded[0]! > min || rounded[1]! < max) {
        notes.push('Uyarı: yuvarlanan [a, b] aralığı verinin tamamını kapsamıyor.');
      }
      return fitted(
        [
          { symbol: 'a', value: a, formula: '\\hat a=\\bar x-h,\\; h=\\frac{\\sqrt{12m_2+1}-1}{2}' },
          { symbol: 'b', value: b, formula: '\\hat b=\\bar x+h' },
        ],
        rounded,
        notes,
      );
    }
    case 'normal':
      if (m2 <= 0) return unavailable(NO_SPREAD);
      return fitted(
        [
          { symbol: 'μ', value: mean, formula: '\\hat\\mu=\\bar x' },
          ...sigmaEstimates(m2, '\\hat\\sigma^2=m_2=\\frac{1}{N}\\sum(x_i-\\bar x)^2'),
        ],
        [mean, Math.sqrt(m2)],
        [M2_NOTE],
      );
    case 'exponential':
      if (mean <= 0) return unavailable('Ortalama pozitif olmadığından λ kestirilemez.');
      return fitted(
        [{ symbol: 'λ', value: 1 / mean, formula: '\\hat\\lambda=1/\\bar x' }],
        [1 / mean],
      );
    case 'continuousUniform': {
      if (m2 <= 0) return unavailable(NO_SPREAD);
      const half = Math.sqrt(3 * m2);
      const a = mean - half;
      const b = mean + half;
      const notes =
        a > min || b < max
          ? ['Uyarı: kestirilen [a, b] aralığı verinin tamamını kapsamıyor.']
          : [];
      return fitted(
        [
          { symbol: 'a', value: a, formula: '\\hat a=\\bar x-\\sqrt{3m_2}' },
          { symbol: 'b', value: b, formula: '\\hat b=\\bar x+\\sqrt{3m_2}' },
        ],
        [a, b],
        notes,
      );
    }
    case 'gamma': {
      if (m2 <= 0 || mean <= 0) return unavailable(NO_SPREAD);
      const alpha = (mean * mean) / m2;
      const theta = m2 / mean;
      return fitted(
        [
          { symbol: 'α', value: alpha, formula: '\\hat\\alpha=\\bar x^2/m_2' },
          { symbol: 'θ', value: theta, formula: '\\hat\\theta=m_2/\\bar x' },
        ],
        [alpha, theta],
      );
    }
    case 'logNormal': {
      if (m2 <= 0 || mean <= 0) return unavailable(NO_SPREAD);
      const variance = Math.log1p(m2 / (mean * mean));
      const mu = Math.log(mean) - variance / 2;
      return fitted(
        [
          {
            symbol: 'μ',
            value: mu,
            formula: '\\hat\\mu=\\ln\\bar x-\\tfrac12\\ln(1+m_2/\\bar x^2)',
          },
          ...sigmaEstimates(variance, '\\hat\\sigma^2=\\ln(1+m_2/\\bar x^2)'),
        ],
        [mu, Math.sqrt(variance)],
        [M2_NOTE],
      );
    }
  }
}

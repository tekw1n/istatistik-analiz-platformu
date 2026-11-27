import type { DistributionId, SupportOptions } from '../../distributions/catalog';
import type { Method } from '../../distributions/estimation/types';
import references from './sampleReferences.json';
import type { ClassRow, FrequencyRow } from './tables';

export type SampleEntry =
  | { source: 'frequency'; rows: FrequencyRow[]; openLast: boolean }
  | { source: 'grouped'; rows: ClassRow[]; openFirst: boolean; openLast: boolean };

export interface SampleReference {
  /** In the order of the distribution catalog. */
  params: number[];
  total: number;
  initialClassCount: number;
  finalClassCount: number;
  df: number;
  statistic: number;
  criticalValue: number;
  pValue: number;
  rejectNull: boolean;
}

export interface Sample {
  id: keyof typeof references;
  title: string;
  question: string;
  distribution: DistributionId;
  entry: SampleEntry;
  /** 'manual' tests the externally given parameters (m = 0). */
  mode: Method | 'manual';
  manualValues?: number[];
  options?: SupportOptions;
  alpha: number;
  /** Expected calculations, shown to the student. */
  steps: string[];
  reference: SampleReference;
}

const counts = (first: number, frequencies: number[]): FrequencyRow[] =>
  frequencies.map((f, i) => ({ x: String(first + i), f: String(f) }));

/** An empty bound means the class is open on that side. */
const classRows = (bounds: (number | null)[], frequencies: number[]): ClassRow[] =>
  frequencies.map((f, i) => ({
    lower: String(bounds[i] ?? ''),
    upper: String(bounds[i + 1] ?? ''),
    f: String(f),
  }));

export const SAMPLES: Sample[] = [
  {
    id: 'poissonCalls',
    title: 'Poisson: destek hattına gelen çağrılar',
    question:
      'Bir üniversitenin bilgi işlem destek hattına gelen çağrılar 1 dakikalık 120 zaman aralığında sayılmıştır. Dakika başına gelen çağrı sayısı Poisson dağılımına uyar mı? (α = 0,05)',
    distribution: 'poisson',
    entry: { source: 'frequency', rows: counts(0, [24, 28, 28, 22, 10, 5, 3]), openLast: true },
    mode: 'mle',
    alpha: 0.05,
    steps: [
      'Son sınıf açık uçludur (X ≥ 6) ve 3 gözlem içerir.',
      'λ, açık sınıfın olasılığı da kullanılarak EÇOK ile kestirilir (m = 1); açık sınıf nedeniyle momentler metodu uygulanamaz.',
      'Beklenen frekanslar Eᵢ = N·pᵢ ile bulunur. En üst sınıfın beklenen frekansı 5’ten küçük olduğu için bir önceki sınıfla birleştirilir.',
      'sd = k′ − 1 − m ile Ki-Kare testi uygulanır.',
    ],
    reference: references.poissonCalls,
  },
  {
    id: 'binomialBulbs',
    title: 'Binom: kutulardaki kusurlu ampuller',
    question:
      'Her birinde 5 ampul bulunan 200 kutu denetlenmiş ve her kutudaki kusurlu ampul sayısı kaydedilmiştir. Kusurlu ampul sayısı Binom dağılımına uyar mı? (n = 5 biliniyor, α = 0,05)',
    distribution: 'binomial',
    entry: { source: 'frequency', rows: counts(0, [112, 68, 17, 2, 1, 0]), openLast: false },
    mode: 'mle',
    options: { n: 5 },
    alpha: 0.05,
    steps: [
      'p̂ = x̄ / n = (Σ xᵢ fᵢ / N) / 5 = 0,56 / 5 = 0,112 (m = 1).',
      'Eᵢ = 200 · C(5, x) p̂ˣ (1 − p̂)⁵⁻ˣ hesaplanır.',
      'Üst kuyrukta Eᵢ < 5 olan sınıflar içeri doğru birleştirilir; X = 2, 3, 4, 5 tek sınıf olur.',
      'sd = 3 − 1 − 1 = 1.',
    ],
    reference: references.binomialBulbs,
  },
  {
    id: 'uniformDie',
    title: 'Kesikli Düzgün: zar hilesiz mi?',
    question:
      'Bir zar 120 kez atılmış ve gelen yüzler sayılmıştır. Zarın hilesiz olduğu, yani sonuçların 1–6 arasında kesikli düzgün dağıldığı söylenebilir mi? (α = 0,05)',
    distribution: 'discreteUniform',
    entry: { source: 'frequency', rows: counts(1, [25, 17, 15, 23, 24, 16]), openLast: false },
    mode: 'manual',
    manualValues: [1, 6],
    alpha: 0.05,
    steps: [
      'a = 1 ve b = 6 problemden bilinir; veriden parametre kestirilmez (m = 0).',
      'Her yüz için Eᵢ = 120 / 6 = 20 olur.',
      'χ² = Σ (Oᵢ − 20)² / 20 = 100 / 20 = 5.',
      'sd = 6 − 1 − 0 = 5.',
    ],
    reference: references.uniformDie,
  },
  {
    id: 'exponentialService',
    title: 'Üstel: banka veznesinde işlem süreleri',
    question:
      'Bir banka veznesinde 100 müşterinin işlem süresi (dakika) gruplandırılmıştır. İşlem süreleri üstel dağılıma uyar mı? (α = 0,05)',
    distribution: 'exponential',
    entry: {
      source: 'grouped',
      rows: classRows([0, 2, 4, 6, 8, 10, null], [42, 20, 17, 8, 5, 8]),
      openFirst: false,
      openLast: true,
    },
    mode: 'mle',
    alpha: 0.05,
    steps: [
      'Son sınıf açık uçlu olduğundan momentler metodu uygulanamaz.',
      'Eşit genişlikli sınıflarda q = e^(−2λ) için EÇOK çözümü q̂ = 138 / (138 + 92) = 0,6 olur; λ̂ = −ln(0,6) / 2 (m = 1).',
      'Tüm sınıflarda Eᵢ ≥ 5 olduğundan birleştirme gerekmez.',
      'sd = 6 − 1 − 1 = 4.',
    ],
    reference: references.exponentialService,
  },
  {
    id: 'normalScores',
    title: 'Normal: istatistik sınavı notları',
    question:
      'İstatistik sınavına giren 80 öğrencinin notları 10 puanlık sınıflara ayrılmıştır. Notlar normal dağılıma uyar mı? Parametreleri sınıf orta noktalarından momentler metoduyla kestiriniz. (α = 0,05)',
    distribution: 'normal',
    entry: {
      source: 'grouped',
      rows: classRows([30, 40, 50, 60, 70, 80, 90, 100], [3, 8, 17, 24, 16, 9, 3]),
      openFirst: false,
      openLast: false,
    },
    mode: 'mm',
    alpha: 0.05,
    steps: [
      'Sınıf orta noktalarından x̄ = 65,125 ve m₂ (N’e bölünen) hesaplanır; μ̂ = x̄, σ̂ = √m₂ (m = 2).',
      'İlk sınıf −∞’a, son sınıf +∞’a açılarak olasılıklar bulunur; böylece Σ Eᵢ = N olur.',
      'Her iki uçta Eᵢ < 5 olduğundan uç sınıflar komşularıyla birleştirilir.',
      'sd = 5 − 1 − 2 = 2. Parametreler orta noktalardan kestirildiği için p-değeri yaklaşıktır.',
    ],
    reference: references.normalScores,
  },
];

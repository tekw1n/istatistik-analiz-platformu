import { checkData, DISTRIBUTIONS, type DistributionId } from '../catalog';
import type { EstimationOptions, Observations } from './types';

function requireData(condition: boolean, message: string): void {
  if (!condition) throw new RangeError(message);
}

const isFrequency = (f: number) => Number.isInteger(f) && f >= 0;
const FREQUENCY_MESSAGE = 'Frekanslar negatif olmayan tam sayı olmalıdır.';

/**
 * Validates observations against a distribution and throws a Turkish RangeError otherwise.
 */
export function validateObservations(
  id: DistributionId,
  data: Observations,
  options: EstimationOptions,
): void {
  const { name, kind, dataSupport } = DISTRIBUTIONS[id];
  if (id === 'binomial') {
    requireData(
      Number.isInteger(options.n) && options.n! >= 1,
      'Binom için bilinen deneme sayısı n (pozitif tam sayı) girilmelidir.',
    );
  }

  if (data.type === 'classes') {
    requireData(kind === 'continuous', `${name} kesikli bir dağılımdır; sınıflı veri kullanılamaz.`);
    const { classes } = data;
    requireData(classes.length > 0, 'En az bir sınıf girilmelidir.');
    const { min } = dataSupport(options);
    classes.forEach((c, i) => {
      requireData(isFrequency(c.frequency), FREQUENCY_MESSAGE);
      requireData(c.lower < c.upper, 'Her sınıfta alt sınır üst sınırdan küçük olmalıdır.');
      requireData(
        i === 0 || c.lower === classes[i - 1]!.upper,
        'Sınıflar sıralı ve bitişik olmalıdır; boşluk veya çakışma bulunmamalıdır.',
      );
      requireData(
        (c.lower === -Infinity || c.lower >= min) && c.upper > min,
        `${name} dağılımının desteği ${min} değerinden başlar; sınıf sınırları bunun altında olamaz.`,
      );
    });
    requireData(classes.some((c) => c.frequency > 0), 'Toplam frekans sıfır olamaz.');
    return;
  }

  const { values, frequencies, openTail } = data;
  requireData(
    !frequencies || frequencies.length === values.length,
    'Değer ve frekans sayıları eşit olmalıdır.',
  );
  requireData((frequencies ?? []).every(isFrequency), FREQUENCY_MESSAGE);
  const observed = values.filter((_, i) => !frequencies || frequencies[i]! > 0);
  const reason = checkData(id, observed, options);
  requireData(reason === null, reason!);

  if (openTail) {
    requireData(kind === 'discrete', 'Açık uç X ≥ k yalnızca kesikli dağılımlarda kullanılır.');
    requireData(isFrequency(openTail.frequency), FREQUENCY_MESSAGE);
    const tailReason = checkData(id, [openTail.from], options);
    requireData(tailReason === null, tailReason!);
    requireData(
      observed.every((v) => v < openTail.from),
      'Açık uçlu sınıf, listelenen değerlerle çakışmamalıdır.',
    );
  }
  requireData(observed.length > 0 || (openTail?.frequency ?? 0) > 0, 'Gözlem bulunmuyor.');
}

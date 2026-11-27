import type { ChiSquareResult } from '../../chiSquare/types';
import { formatNumber } from '../../utils/format';
import type { ParameterMode } from '../goodness-of-fit/analysis';

const METHODS: Record<ParameterMode, string> = {
  mle: 'en çok olabilirlik (EÇOK) yöntemiyle kestirilen',
  mm: 'momentler metoduyla (M.M.) kestirilen',
  manual: 'elle girilen',
};

/** The statistical interpretation paragraph by paragraph, in Turkish. */
export function interpret(
  name: string,
  mode: ParameterMode,
  result: ChiSquareResult,
  /** The descriptive data come from class midpoints. */
  midpointSummary: boolean,
): string[] {
  const text = [
    `${formatNumber(result.total)} gözlemlik veri, ${METHODS[mode]} parametrelerle ${name} dağılımına karşı Ki-Kare uyum iyiliği testiyle incelenmiştir.`,
  ];

  if (result.history.length > 0) {
    text.push(
      `Beklenen frekansı 5’ten küçük sınıflar komşularıyla birleştirilmiştir (${result.history.length} adım). Sınıf sayısı: birleştirme öncesi ${result.rawRows.length}, sonrası ${result.mergedRows.length}.`,
    );
  }

  if (result.status === 'ok') {
    const { statistic, degreesOfFreedom: df, criticalValue, pValue, alpha } = result;
    text.push(
      `Test istatistiği χ² = ${formatNumber(statistic, 4)}, serbestlik derecesi ${df}, α = ${formatNumber(alpha)} için kritik değer ${formatNumber(criticalValue, 4)} ve p-değeri ${formatNumber(pValue)} bulunmuştur.`,
      result.conclusion,
    );
    if (!result.rejectNull) {
      text.push(
        'H₀’ın reddedilememesi dağılımın doğru olduğu anlamına gelmez; başka dağılımlar da veriyle uyumlu olabilir ve küçük örneklemde testin uyumsuzluğu yakalama gücü düşüktür.',
      );
    }
  } else {
    text.push(`Hipotez testi sonuçlandırılamamıştır. ${result.reason}`);
  }

  if (result.pValueApproximate && result.status === 'ok') {
    text.push(
      'p-değeri yaklaşıktır (gerekçesi Ki-Kare analizi bölümündeki notta verilmiştir); α’ya yakın sonuçlar ihtiyatla yorumlanmalıdır.',
    );
  }
  if (midpointSummary) {
    text.push('Özet istatistikler sınıf orta noktalarından hesaplandığı için yaklaşıktır.');
  }
  return text;
}

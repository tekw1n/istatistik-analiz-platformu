import type { ChiSquareResult } from '../../chiSquare/types';
import { Messages } from '../../components/ui/Messages';
import { Tex } from '../../components/ui/Tex';
import { DISTRIBUTIONS, type DistributionId } from '../../distributions/catalog';
import { formatNumber, texNumber } from '../../utils/format';
import { ClassTable, MergeHistory } from './ChiSquareTables';

function Hypotheses({ name }: { name: string }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-md border border-line bg-muted p-3">
      <dt>
        <Tex math="H_0:" />
      </dt>
      <dd>Veri {name} dağılımına uygundur.</dd>
      <dt>
        <Tex math="H_1:" />
      </dt>
      <dd>Veri {name} dağılımına uygun değildir.</dd>
    </dl>
  );
}

/** Statistic, degrees of freedom, p-value and critical value with the numbers put in. */
function Equations({ result }: { result: Exclude<ChiSquareResult, { status: 'impossible' }> }) {
  const k = result.mergedRows.length;
  const { statistic, degreesOfFreedom: df, estimatedCount: m } = result;
  const lines = [
    `E_i=N\\,p_i,\\quad N=${texNumber(result.total)}`,
    `\\chi^2=\\sum_{i=1}^{k'}\\frac{(O_i-E_i)^2}{E_i}=${texNumber(statistic, 4)}`,
    `sd=k'-1-m=${k}-1-${m}=${df}`,
  ];
  if (result.status === 'ok') {
    lines.push(
      `p=P\\left(\\chi^2_{${df}}\\ge ${texNumber(statistic, 4)}\\right)=Q\\!\\left(\\tfrac{sd}{2},\\tfrac{\\chi^2}{2}\\right)=${texNumber(result.pValue)}`,
      `\\chi^2_{\\text{tablo}}=F^{-1}_{\\chi^2,\\,${df}}(1-${texNumber(result.alpha)})=${texNumber(result.criticalValue, 4)}`,
    );
  }
  return (
    <div className="space-y-1">
      {lines.map((line) => (
        <Tex key={line} math={line} display />
      ))}
    </div>
  );
}

function Decision({ result }: { result: Extract<ChiSquareResult, { status: 'ok' }> }) {
  const facts: [string, string][] = [
    ['İlk sınıf sayısı', String(result.rawRows.length)],
    ['Birleştirme sonrası sınıf sayısı', String(result.mergedRows.length)],
    ['Kestirilen parametre sayısı m', String(result.estimatedCount)],
    ['Serbestlik derecesi sd', String(result.degreesOfFreedom)],
    ['Ki-Kare istatistiği χ²', formatNumber(result.statistic, 4)],
    ['Kritik değer', formatNumber(result.criticalValue, 4)],
    [`p-değeri${result.pValueApproximate ? ' (yaklaşık)' : ''}`, formatNumber(result.pValue)],
    ['Anlamlılık düzeyi α', formatNumber(result.alpha)],
  ];
  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {facts.map(([term, value]) => (
          <div key={term} className="rounded-md border border-line p-3">
            <dt className="hint">{term}</dt>
            <dd className="font-mono text-lg font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <div
        role="status"
        className={`rounded-md border-2 p-4 ${result.rejectNull ? 'border-danger bg-danger-soft' : 'border-primary bg-primary-soft'}`}
      >
        <p className="text-lg font-semibold">
          Karar: H₀ {result.rejectNull ? 'reddedilir' : 'reddedilemez'}
        </p>
        <Tex
          math={`p=${texNumber(result.pValue)}\\;${result.rejectNull ? '<' : '\\ge'}\\;\\alpha=${texNumber(result.alpha)}`}
        />
        <p className="mt-1 text-sm">{result.conclusion}</p>
      </div>
    </div>
  );
}

export function ChiSquareView({ id, result }: { id: DistributionId; result: ChiSquareResult }) {
  const { name, kind } = DISTRIBUTIONS[id];
  return (
    <div className="space-y-5">
      <Hypotheses name={name} />
      {result.status === 'ok' ? (
        <Decision result={result} />
      ) : (
        <div role="alert" className="rounded-md border-2 border-warning bg-warning-soft p-4">
          <p className="font-semibold text-warning">Test sonucu yok</p>
          <p className="text-sm">{result.reason}</p>
        </div>
      )}
      <Messages kind="warning" items={result.notes} />
      {result.status !== 'impossible' && <Equations result={result} />}
      <ClassTable
        caption="Ham tablo (birleştirme öncesi)"
        kind={kind}
        rows={result.rawRows}
        markSmall
      />
      {result.status !== 'impossible' && (
        <>
          <MergeHistory kind={kind} history={result.history} />
          <ClassTable
            caption="Nihai tablo (birleştirme sonrası)"
            kind={kind}
            rows={result.mergedRows}
            originals={result.rawRows}
          />
        </>
      )}
    </div>
  );
}

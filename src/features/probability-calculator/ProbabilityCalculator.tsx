import { ProbabilityChart } from '../../components/charts/ProbabilityChart';
import { Choices } from '../../components/ui/Choices';
import { Tex } from '../../components/ui/Tex';
import { DISTRIBUTIONS, type DistributionId } from '../../distributions/catalog';
import type { Distribution } from '../../distributions/distributionTypes';
import { formatNumber } from '../../utils/format';
import { parseCell } from '../data-entry/numbers';
import {
  calculate,
  defaultBounds,
  type Answer,
  type CalculatorInput,
  type Query,
} from './calculate';

const TYPES: { value: Query['type']; label: string }[] = [
  { value: 'point', label: 'P(X = a)' },
  { value: 'atMost', label: 'P(X ≤ a)' },
  { value: 'between', label: 'P(a ≤ X ≤ b)' },
];

/** Answers the query typed so far, or says what is missing. */
function solve(
  distribution: Distribution,
  type: Query['type'],
  aText: string,
  bText: string,
): { answer: Answer } | { message: string; invalid: boolean } {
  const a = parseCell(aText);
  const b = parseCell(bText);
  if (a === null || (type === 'between' && b === null)) {
    const typed = [aText, ...(type === 'between' ? [bText] : [])];
    const invalid = typed.some((t) => t.trim() !== '' && parseCell(t) === null);
    return {
      message: invalid ? 'Sınırlar sayı olmalıdır.' : 'Olasılığı hesaplamak için sınır girin.',
      invalid,
    };
  }
  try {
    const query: Query = type === 'between' ? { type, a, b: b! } : { type, a };
    return { answer: calculate(distribution, query) };
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    return { message: error.message, invalid: true };
  }
}

export function ProbabilityCalculator({
  id,
  distribution,
  params,
  mean,
  value,
  onChange,
}: {
  id: DistributionId;
  distribution: Distribution;
  params: readonly number[];
  mean: number;
  value: CalculatorInput;
  onChange: (value: CalculatorInput) => void;
}) {
  const defaults = defaultBounds(distribution, mean);
  const asText = (x: number) => String(x).replace('.', ',');
  const { type } = value;
  const a = value.a ?? asText(defaults.a);
  const b = value.b ?? asText(defaults.b);
  const { name, parameters, kind } = DISTRIBUTIONS[id];
  const solution = solve(distribution, type, a, b);
  const answer = 'answer' in solution ? solution.answer : null;

  const input = (label: string, value: string, set: (v: string) => void, key: string) => (
    <div>
      <label className="label" htmlFor={`probability-${key}`}>
        {label}
      </label>
      <input
        id={`probability-${key}`}
        className="field max-w-40"
        inputMode="decimal"
        value={value}
        onChange={(e) => set(e.target.value)}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <p className="text-sm">
        Dağılım: <strong>{name}</strong> (
        {parameters.map((p, i) => `${p.symbol} = ${formatNumber(params[i]!, 4)}`).join(', ')}).
        Testte seçili parametre seti kullanılır.
      </p>
      {kind === 'continuous' && (
        <p className="rounded-md border-l-4 border-primary bg-primary-soft p-3 text-sm">
          <strong>Sürekli dağılımda P(X = a) = 0.</strong> Tek bir noktanın altında alan yoktur;
          olasılık yalnızca aralıklar için sıfırdan büyük olabilir. f(a) bir olasılık değil,
          yoğunluktur.
        </p>
      )}
      <Choices
        legend="Hesaplanacak olasılık"
        options={TYPES}
        value={type}
        onChange={(next) => onChange({ ...value, type: next })}
      />
      <div className="flex flex-wrap gap-4">
        {input('a', a, (next) => onChange({ ...value, a: next }), 'a')}
        {type === 'between' && input('b', b, (next) => onChange({ ...value, b: next }), 'b')}
      </div>
      <div aria-live="polite">
        {answer ? (
          <div className="rounded-md border border-line p-4">
            <p className="font-mono text-2xl font-semibold tabular-nums">
              {formatNumber(answer.probability)}
            </p>
            <Tex math={answer.formula} display />
            <ul className="hint list-disc pl-5">
              {answer.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        ) : (
          'message' in solution && (
            <p className={solution.invalid ? 'text-sm text-danger' : 'hint'}>{solution.message}</p>
          )
        )}
      </div>
      <ProbabilityChart distribution={distribution} region={answer?.region ?? [NaN, NaN]} />
    </div>
  );
}

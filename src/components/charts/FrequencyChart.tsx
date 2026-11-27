import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ChiSquareRow } from '../../chiSquare/types';
import type { Distribution } from '../../distributions/distributionTypes';
import { classLabel } from '../../features/goodness-of-fit/classLabel';
import { formatNumber } from '../../utils/format';
import { AXIS_TICK, COLORS, Figure, Legend, TooltipBox } from './ChartParts';
import { niceAxis } from './chartData';

export const MAX_CLASSES = 60;

/** Observed and expected frequency of every class, side by side. */
export function FrequencyChart({
  kind,
  rows,
  width = '100%',
  title = 'Gözlenen ve beklenen frekanslar',
}: {
  title?: string;
  kind: Distribution['kind'];
  rows: ChiSquareRow[];
  /** A fixed pixel width for printing; the chart follows its container otherwise. */
  width?: number | '100%';
}) {
  const data = rows.map((row) => ({
    label: classLabel(kind, row),
    observed: row.observed,
    expected: row.expected,
  }));
  const y = niceAxis(Math.max(...data.flatMap((d) => [d.observed, d.expected])));
  return (
    <Figure
      title={title}
      description="Her sınıf için Oᵢ ve Eᵢ. Aynı sayılar hesap tablolarında da yer alır."
    >
      <Legend
        items={[
          { label: 'Gözlenen Oᵢ', swatch: 'h-3 bg-observed' },
          { label: 'Beklenen Eᵢ', swatch: 'h-3 bg-model' },
        ]}
      />
      <ResponsiveContainer width={width} height={340}>
        <BarChart data={data} barGap={2} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid vertical={false} stroke={COLORS.grid} />
          <XAxis
            dataKey="label"
            tick={AXIS_TICK}
            angle={-35}
            textAnchor="end"
            height={78}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, y.top]}
            ticks={y.ticks}
            tick={AXIS_TICK}
            width={56}
            tickFormatter={(v: number) => formatNumber(v, 2)}
          />
          <Tooltip
            isAnimationActive={false}
            cursor={{ fill: COLORS.grid }}
            content={({ active, payload }) => {
              const row = payload?.[0]?.payload as (typeof data)[number] | undefined;
              return active && row ? (
                <TooltipBox
                  title={row.label}
                  rows={[
                    ['Gözlenen Oᵢ', formatNumber(row.observed)],
                    ['Beklenen Eᵢ', formatNumber(row.expected, 4)],
                    ['Fark Oᵢ − Eᵢ', formatNumber(row.observed - row.expected, 4)],
                  ]}
                />
              ) : null;
            }}
          />
          <Bar
            dataKey="observed"
            fill={COLORS.observed}
            maxBarSize={24}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
          <Bar
            dataKey="expected"
            fill={COLORS.model}
            maxBarSize={24}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </Figure>
  );
}

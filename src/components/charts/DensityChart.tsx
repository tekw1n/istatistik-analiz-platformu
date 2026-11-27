import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ContinuousDistribution } from '../../distributions/distributionTypes';
import type { DataClass } from '../../distributions/estimation/types';
import { formatNumber } from '../../utils/format';
import { AXIS_TICK, COLORS, Figure, Legend, TooltipBox } from './ChartParts';
import { densityChart, niceAxis, niceTicks, type DensityPoint } from './chartData';

/** Density-scaled histogram of the data with the theoretical density curve on top. */
export function DensityChart({
  name,
  distribution,
  classes,
}: {
  name: string;
  distribution: ContinuousDistribution;
  classes: DataClass[];
}) {
  const { points, domain, yMax, clipped, omitted } = densityChart(distribution, classes);
  const y = niceAxis(yMax);
  return (
    <Figure
      title={`Teorik yoğunluk eğrisi: ${name}`}
      description="Histogramın yüksekliği fᵢ / (N · hᵢ) olduğundan alanı göreli frekansı gösterir ve yoğunluk eğrisiyle doğrudan karşılaştırılabilir."
    >
      <Legend
        items={[
          { label: 'Veri histogramı', swatch: 'h-3 border border-observed bg-observed/25' },
          { label: 'Teorik yoğunluk f(x)', swatch: 'h-0.5 bg-model' },
        ]}
      />
      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart data={points} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid vertical={false} stroke={COLORS.grid} />
          <XAxis
            dataKey="x"
            type="number"
            domain={domain}
            tick={AXIS_TICK}
            ticks={niceTicks(...domain)}
            tickFormatter={(v: number) => formatNumber(v, 2)}
          />
          <YAxis
            domain={[0, y.top]}
            ticks={y.ticks}
            allowDataOverflow
            tick={AXIS_TICK}
            width={72}
            tickFormatter={(v: number) => formatNumber(v, 3)}
          />
          <Tooltip
            isAnimationActive={false}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as DensityPoint | undefined;
              return active && point ? (
                <TooltipBox
                  title={`x = ${formatNumber(point.x, 3)}`}
                  rows={[
                    ['f(x)', formatNumber(point.model)],
                    [
                      'Histogram',
                      point.observed === null ? '—' : formatNumber(point.observed),
                    ],
                  ]}
                />
              ) : null;
            }}
          />
          <Area
            dataKey="observed"
            type="stepAfter"
            stroke={COLORS.observed}
            strokeWidth={1}
            fill={COLORS.observed}
            fillOpacity={0.25}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="model"
            type="linear"
            stroke={COLORS.model}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      {omitted.length > 0 && (
        <p className="hint">
          Açık uçlu sınıfların genişliği olmadığından histogramda gösterilmez (
          {omitted
            .map(
              (c) =>
                `${c.lower === -Infinity ? `X < ${formatNumber(c.upper)}` : `X ≥ ${formatNumber(c.lower)}`}: f = ${formatNumber(c.frequency)}`,
            )
            .join('; ')}
          ).
        </p>
      )}
      {clipped && (
        <p className="hint">
          Yoğunluk eğrisi grafiğin üst sınırını aşıyor; histogram okunabilsin diye eğri
          kırpılmıştır.
        </p>
      )}
    </Figure>
  );
}

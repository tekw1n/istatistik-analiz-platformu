import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Distribution } from '../../distributions/distributionTypes';
import { formatNumber } from '../../utils/format';
import { AXIS_TICK, COLORS, Figure, Legend, TooltipBox } from './ChartParts';
import {
  densityRegion,
  MAX_BARS,
  niceAxis,
  niceTicks,
  pmfBars,
  type PmfBar,
  type RegionPoint,
} from './chartData';

const MARGIN = { top: 8, right: 16, left: 0, bottom: 8 };

/** The PMF or density with the queried values highlighted. */
export function ProbabilityChart({
  distribution,
  region: [a, b],
}: {
  distribution: Distribution;
  /** Empty (NaN bounds) before a query. */
  region: [number, number];
}) {
  const yAxis = (peak: number) => {
    const { top, ticks } = niceAxis(peak);
    return (
      <YAxis
        domain={[0, top]}
        ticks={ticks}
        tick={AXIS_TICK}
        width={72}
        tickFormatter={(v: number) => formatNumber(v, 4)}
      />
    );
  };

  if (distribution.kind === 'discrete') {
    const bars = pmfBars(distribution, a, b);
    if (!bars) {
      return (
        <p className="hint">
          {MAX_BARS} değerden geniş aralıklar için olasılık grafiği çizilmez.
        </p>
      );
    }
    return (
      <Figure title="Olasılık fonksiyonu P(X = x)" description="Sorgulanan değerler vurgulanır.">
        <Legend
          items={[
            { label: 'Sorgulanan değerler', swatch: 'h-3 bg-model' },
            { label: 'Diğer değerler', swatch: 'h-3 bg-line' },
          ]}
        />
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={bars} barCategoryGap={2} margin={MARGIN}>
            <CartesianGrid vertical={false} stroke={COLORS.grid} />
            <XAxis dataKey="x" tick={AXIS_TICK} tickFormatter={(v: number) => formatNumber(v)} />
            {yAxis(Math.max(...bars.map((bar) => bar.probability)))}
            <Tooltip
              isAnimationActive={false}
              cursor={{ fill: COLORS.grid }}
              content={({ active, payload }) => {
                const bar = payload?.[0]?.payload as PmfBar | undefined;
                return active && bar ? (
                  <TooltipBox
                    title={`x = ${formatNumber(bar.x)}`}
                    rows={[['P(X = x)', formatNumber(bar.probability)]]}
                  />
                ) : null;
              }}
            />
            <Bar dataKey="probability" maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {bars.map((bar) => (
                <Cell key={bar.x} fill={bar.selected ? COLORS.model : COLORS.muted} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Figure>
    );
  }

  const points = densityRegion(distribution, a, b);
  const domain: [number, number] = [points[0]!.x, points[points.length - 1]!.x];
  return (
    <Figure
      title="Yoğunluk fonksiyonu f(x)"
      description="Olasılık, eğrinin altındaki taralı alandır; tek bir noktanın alanı sıfırdır."
    >
      <Legend
        items={[
          { label: 'f(x)', swatch: 'h-0.5 bg-model' },
          { label: 'Sorgulanan alan', swatch: 'h-3 bg-model/30' },
        ]}
      />
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={points} margin={MARGIN}>
          <CartesianGrid vertical={false} stroke={COLORS.grid} />
          <XAxis
            dataKey="x"
            type="number"
            domain={domain}
            tick={AXIS_TICK}
            ticks={niceTicks(...domain)}
            tickFormatter={(v: number) => formatNumber(v, 2)}
          />
          {yAxis(Math.max(...points.map((p) => p.density).filter(Number.isFinite)))}
          <Tooltip
            isAnimationActive={false}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as RegionPoint | undefined;
              return active && point ? (
                <TooltipBox
                  title={`x = ${formatNumber(point.x, 3)}`}
                  rows={[['f(x)', formatNumber(point.density)]]}
                />
              ) : null;
            }}
          />
          <Area
            dataKey="region"
            type="linear"
            stroke="none"
            fill={COLORS.model}
            fillOpacity={0.3}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="density"
            type="linear"
            stroke={COLORS.model}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          {/* A single point has no area; the line shows where it is. */}
          {a === b && <ReferenceLine x={a} stroke={COLORS.ink} strokeWidth={1} />}
        </ComposedChart>
      </ResponsiveContainer>
    </Figure>
  );
}

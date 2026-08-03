import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAppData } from '../hooks/useAppData';
import { Card, CardTitle, EmptyState } from '../components/ui';
import { buildTrendSeries, type TrendPoint } from '../domain/stats';
import { formatDateShort } from '../domain/format';
import { TRAINING_LABELS } from '../domain/types';

const RANGES = [7, 30, 90] as const;
type RangeDays = (typeof RANGES)[number];

const numberFormat = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });

function formatValue(value: unknown): string {
  if (typeof value === 'number') return numberFormat.format(value);
  if (Array.isArray(value)) return value.map(formatValue).join(' – ');
  return String(value ?? '');
}

interface ChartFrameProps {
  title: string;
  description: string;
  children: React.ReactElement;
}

function ChartFrame({ title, description, children }: ChartFrameProps) {
  return (
    <Card className="mb-4">
      <CardTitle>{title}</CardTitle>
      <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">{description}</p>
      <div role="img" aria-label={`${title}. ${description}`} className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

const axisStyle = { fill: 'var(--chart-ink)', fontSize: 12 };

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid var(--chart-grid)',
  background: 'var(--color-white, #fff)',
  color: 'inherit',
};

export function HistoryPage() {
  const { entries } = useAppData();
  const [range, setRange] = useState<RangeDays>(30);

  const series: TrendPoint[] = useMemo(() => buildTrendSeries(entries, range), [entries, range]);
  const hasWeight = series.some((p) => p.weightKg !== null);
  const hasWaist = series.some((p) => p.waistCm !== null);
  const hasSleep = series.some((p) => p.sleepHours !== null);
  const hasEnergy = series.some((p) => p.energy !== null);
  const hasTraining = series.some((p) => p.trainingMinutes > 0);

  const chartData = series.map((p) => ({
    ...p,
    label: formatDateShort(p.date),
    average7: p.average7 !== null ? Math.round(p.average7 * 100) / 100 : null,
  }));

  return (
    <main className="p-4">
      <header className="mb-4 pt-2">
        <h1 className="text-xl font-bold">Verlauf</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Trends zählen – einzelne Werte sind nur Momentaufnahmen.
        </p>
      </header>

      <div role="group" aria-label="Zeitraum wählen" className="mb-4 flex gap-2">
        {RANGES.map((days) => (
          <button
            key={days}
            type="button"
            aria-pressed={range === days}
            onClick={() => setRange(days)}
            className={`min-h-12 flex-1 rounded-xl border text-base font-medium transition-colors ${
              range === days
                ? 'border-teal-700 bg-teal-700 text-white'
                : 'border-slate-300 bg-white hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800'
            }`}
          >
            {days} Tage
          </button>
        ))}
      </div>

      {entries.length === 0 && (
        <EmptyState title="Noch keine Einträge">
          Trage unter „Heute“ deinen ersten Check-in ein – hier entsteht dann dein Verlauf.
        </EmptyState>
      )}

      {hasWeight && (
        <ChartFrame
          title="Gewicht"
          description="Tageswerte (durchgezogen, mit Punkten) und 7-Tage-Durchschnitt (gestrichelt)."
        >
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis dataKey="label" tick={axisStyle} tickLine={false} minTickGap={24} />
            <YAxis
              tick={axisStyle}
              tickLine={false}
              domain={['auto', 'auto']}
              tickFormatter={(v: number) => numberFormat.format(v)}
            />
            <Tooltip
              formatter={(value) => [`${formatValue(value ?? '')} kg`, undefined]}
              contentStyle={tooltipStyle}
            />
            <Legend />
            <Line
              name="Gewicht (kg)"
              dataKey="weightKg"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={{ r: 2.5, fill: 'var(--chart-1)', strokeWidth: 0 }}
              connectNulls
            />
            <Line
              name="7-Tage-Durchschnitt"
              dataKey="average7"
              stroke="var(--chart-2)"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              connectNulls
            />
          </LineChart>
        </ChartFrame>
      )}

      {hasWaist && (
        <ChartFrame title="Bauchumfang" description="Bauchumfang in cm.">
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis dataKey="label" tick={axisStyle} tickLine={false} minTickGap={24} />
            <YAxis
              tick={axisStyle}
              tickLine={false}
              domain={['auto', 'auto']}
              tickFormatter={(v: number) => numberFormat.format(v)}
            />
            <Tooltip
              formatter={(value) => [`${formatValue(value ?? '')} cm`, undefined]}
              contentStyle={tooltipStyle}
            />
            <Line
              name="Bauchumfang (cm)"
              dataKey="waistCm"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={{ r: 2.5, fill: 'var(--chart-1)', strokeWidth: 0 }}
              connectNulls
            />
          </LineChart>
        </ChartFrame>
      )}

      {hasSleep && (
        <ChartFrame title="Schlaf" description="Schlafdauer in Stunden.">
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis dataKey="label" tick={axisStyle} tickLine={false} minTickGap={24} />
            <YAxis tick={axisStyle} tickLine={false} domain={[0, 'auto']} />
            <Tooltip
              formatter={(value) => [`${formatValue(value ?? '')} h`, undefined]}
              contentStyle={tooltipStyle}
            />
            <Line
              name="Schlaf (h)"
              dataKey="sleepHours"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={{ r: 2.5, fill: 'var(--chart-1)', strokeWidth: 0 }}
              connectNulls
            />
          </LineChart>
        </ChartFrame>
      )}

      {hasEnergy && (
        <ChartFrame title="Energie" description="Selbsteinschätzung von 1 (niedrig) bis 5 (hoch).">
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis dataKey="label" tick={axisStyle} tickLine={false} minTickGap={24} />
            <YAxis tick={axisStyle} tickLine={false} domain={[0, 5]} tickCount={6} />
            <Tooltip
              formatter={(value) => [`${formatValue(value ?? '')} von 5`, undefined]}
              contentStyle={tooltipStyle}
            />
            <Line
              name="Energie (1–5)"
              dataKey="energy"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={{ r: 2.5, fill: 'var(--chart-1)', strokeWidth: 0 }}
              connectNulls
            />
          </LineChart>
        </ChartFrame>
      )}

      {hasTraining && (
        <ChartFrame title="Training" description="Trainingsminuten pro Tag.">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis dataKey="label" tick={axisStyle} tickLine={false} minTickGap={24} />
            <YAxis tick={axisStyle} tickLine={false} domain={[0, 'auto']} />
            <Tooltip
              formatter={(value, _name, item) => {
                const type = (item?.payload as TrendPoint | undefined)?.trainingType;
                const label = type ? TRAINING_LABELS[type] : 'Training';
                return [`${formatValue(value ?? '')} min`, label];
              }}
              contentStyle={tooltipStyle}
            />
            <Bar
              name="Training (min)"
              dataKey="trainingMinutes"
              fill="var(--chart-1)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartFrame>
      )}

      {entries.length > 0 && !hasWeight && !hasWaist && !hasSleep && !hasEnergy && !hasTraining && (
        <EmptyState title="Noch keine Messwerte">
          Deine Einträge enthalten für diesen Zeitraum noch keine Zahlenwerte.
        </EmptyState>
      )}
    </main>
  );
}

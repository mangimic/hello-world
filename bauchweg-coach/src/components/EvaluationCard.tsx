import { useMemo } from 'react';
import type { DailyEntry } from '../domain/types';
import { evaluateDay, type AmpelLevel } from '../domain/evaluation';
import { Card, CardTitle } from './ui';

/** Symbol + Text, damit die Ampel auch ohne Farbwahrnehmung verständlich ist. */
const ampelStyle: Record<AmpelLevel, { symbol: string; label: string; className: string }> = {
  gut: { symbol: '●', label: 'Gut', className: 'text-teal-700 dark:text-teal-300' },
  ok: { symbol: '◐', label: 'Okay', className: 'text-amber-600 dark:text-amber-300' },
  beobachten: { symbol: '○', label: 'Beobachten', className: 'text-slate-600 dark:text-slate-300' },
};

export function EvaluationCard({
  entry,
  entries,
}: {
  entry: DailyEntry;
  entries: readonly DailyEntry[];
}) {
  const evaluation = useMemo(() => evaluateDay(entry, entries), [entry, entries]);

  return (
    <Card data-testid="evaluation-card">
      <CardTitle>Deine Tagesauswertung</CardTitle>
      <p className="mb-4">{evaluation.summary}</p>

      <h3 className="mb-2 text-sm font-semibold text-slate-500 uppercase tracking-wide dark:text-slate-400">
        Tagesampel
      </h3>
      <ul className="mb-4 space-y-2">
        {evaluation.ampel.map((point) => {
          const style = ampelStyle[point.level];
          return (
            <li key={point.text} className="flex items-start gap-2">
              <span aria-hidden="true" className={`mt-0.5 ${style.className}`}>
                {style.symbol}
              </span>
              <span>
                <span className={`font-medium ${style.className}`}>{style.label}: </span>
                {point.text}
              </span>
            </li>
          );
        })}
      </ul>

      <h3 className="mb-2 text-sm font-semibold text-slate-500 uppercase tracking-wide dark:text-slate-400">
        Einordnung
      </h3>
      <ul className="mb-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
        {evaluation.weightContext.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>

      <div className="mb-4 rounded-xl bg-teal-50 p-3 dark:bg-slate-800">
        <h3 className="text-sm font-semibold text-teal-800 dark:text-teal-300">Dein Tagesfokus</h3>
        <p className="mt-1 text-sm">{evaluation.focus}</p>
      </div>

      <p className="text-sm italic text-slate-600 dark:text-slate-300">
        {evaluation.closingQuestion}
      </p>
    </Card>
  );
}

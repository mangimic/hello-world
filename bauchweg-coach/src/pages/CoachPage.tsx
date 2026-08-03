import { useState } from 'react';
import { Button, Card, CardTitle } from '../components/ui';
import { CRAVING_TRIGGER_LABELS, getCravingOptions, type CravingTrigger } from '../domain/craving';

export function CoachPage() {
  const [trigger, setTrigger] = useState<CravingTrigger | null>(null);
  const options = trigger ? getCravingOptions(trigger) : null;

  return (
    <main className="p-4">
      <header className="mb-4 pt-2">
        <h1 className="text-xl font-bold">Coach</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Schnelle Hilfe bei Heißhunger – ohne Verbote, ohne Bewertung.
        </p>
      </header>

      <Card className="mb-4">
        <CardTitle>Was trifft gerade am ehesten zu?</CardTitle>
        <div role="radiogroup" aria-label="Auslöser wählen" className="flex flex-col gap-2">
          {(Object.keys(CRAVING_TRIGGER_LABELS) as CravingTrigger[]).map((key) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={trigger === key}
              onClick={() => setTrigger(key)}
              className={`min-h-12 rounded-xl border px-4 py-3 text-left text-base font-medium transition-colors ${
                trigger === key
                  ? 'border-teal-700 bg-teal-700 text-white'
                  : 'border-slate-300 bg-white hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800'
              }`}
            >
              {CRAVING_TRIGGER_LABELS[key]}
            </button>
          ))}
        </div>
      </Card>

      {options && (
        <Card data-testid="craving-options">
          <CardTitle>Das könnte dir jetzt helfen</CardTitle>
          <ul className="space-y-3">
            {options.map((option) => (
              <li key={option.title} className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
                <p className="font-medium">{option.title}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{option.detail}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            Egal wofür du dich entscheidest: Eine einzelne Situation macht keinen Unterschied für
            deinen langfristigen Weg.
          </p>
          <Button variant="ghost" className="mt-2" onClick={() => setTrigger(null)}>
            Zurücksetzen
          </Button>
        </Card>
      )}
    </main>
  );
}

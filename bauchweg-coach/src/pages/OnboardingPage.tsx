import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../hooks/useAppData';
import { Button, Field, Select, TextArea, TextInput } from '../components/ui';
import type { ActivityLevel, BodyType, Gender, Profile, TrainingFrequency } from '../domain/types';
import {
  ACTIVITY_LABELS,
  BODY_TYPE_LABELS,
  GENDER_LABELS,
  TRAINING_FREQUENCY_LABELS,
} from '../domain/types';
import { parseGermanNumber } from '../domain/format';
import { validateOptionalRange, validateRange } from '../domain/validation';

const TOTAL_STEPS = 7;

interface Draft {
  gender: Gender;
  age: string;
  heightCm: string;
  weightKg: string;
  bodyType: BodyType;
  bodyFatPercent: string;
  activityLevel: ActivityLevel;
  trainingFrequency: TrainingFrequency;
  habitsNotes: string;
}

export function OnboardingPage() {
  const { saveProfile } = useAppData();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({
    gender: 'keine_angabe',
    age: '',
    heightCm: '',
    weightKg: '',
    bodyType: 'keine_angabe',
    bodyFatPercent: '',
    activityLevel: 'leicht_aktiv',
    trainingFrequency: 'selten',
    habitsNotes: '',
  });

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setError(null);
  };

  const validateStep = (): string | null => {
    switch (step) {
      case 2:
        return validateRange('age', parseGermanNumber(draft.age));
      case 3:
        return validateRange('heightCm', parseGermanNumber(draft.heightCm));
      case 4:
        return validateRange('weightKg', parseGermanNumber(draft.weightKg));
      case 5:
        return validateOptionalRange('bodyFatPercent', parseGermanNumber(draft.bodyFatPercent));
      default:
        return null;
    }
  };

  const finish = async () => {
    const now = new Date().toISOString();
    const profile: Profile = {
      gender: draft.gender,
      age: parseGermanNumber(draft.age) ?? 0,
      heightCm: parseGermanNumber(draft.heightCm) ?? 0,
      startWeightKg: parseGermanNumber(draft.weightKg) ?? 0,
      bodyType: draft.bodyType,
      activityLevel: draft.activityLevel,
      trainingFrequency: draft.trainingFrequency,
      habitsNotes: draft.habitsNotes.trim(),
      createdAt: now,
      updatedAt: now,
    };
    const bodyFat = parseGermanNumber(draft.bodyFatPercent);
    if (bodyFat !== null) profile.bodyFatPercent = bodyFat;
    await saveProfile(profile);
    navigate('/heute', { replace: true });
  };

  const next = () => {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (step === TOTAL_STEPS) {
      void finish();
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col p-4">
      <header className="mb-6 pt-4">
        <h1 className="text-xl font-bold">BauchWeg Coach</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Ein paar Fragen, damit die App zu dir passt. Alles bleibt auf deinem Gerät.
        </p>
        <div className="mt-4" aria-hidden="true">
          <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-teal-700 transition-all"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400" aria-live="polite">
          Frage {step} von {TOTAL_STEPS}
        </p>
      </header>

      <div className="flex-1">
        {step === 1 && (
          <StepFrame title="Wie möchtest du dich einordnen?">
            <Field label="Geschlecht" optional>
              {(id, describedBy) => (
                <Select
                  id={id}
                  aria-describedby={describedBy}
                  value={draft.gender}
                  onChange={(e) => update('gender', e.target.value as Gender)}
                >
                  {Object.entries(GENDER_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </StepFrame>
        )}

        {step === 2 && (
          <StepFrame title="Wie alt bist du?">
            <Field label="Alter in Jahren" error={error}>
              {(id, describedBy) => (
                <TextInput
                  id={id}
                  aria-describedby={describedBy}
                  inputMode="numeric"
                  autoComplete="off"
                  value={draft.age}
                  invalid={!!error}
                  onChange={(e) => update('age', e.target.value)}
                />
              )}
            </Field>
          </StepFrame>
        )}

        {step === 3 && (
          <StepFrame title="Wie groß bist du?">
            <Field label="Körpergröße in cm" error={error}>
              {(id, describedBy) => (
                <TextInput
                  id={id}
                  aria-describedby={describedBy}
                  inputMode="numeric"
                  autoComplete="off"
                  value={draft.heightCm}
                  invalid={!!error}
                  onChange={(e) => update('heightCm', e.target.value)}
                />
              )}
            </Field>
          </StepFrame>
        )}

        {step === 4 && (
          <StepFrame title="Was wiegst du aktuell?">
            <Field label="Gewicht in kg" hint="Zum Beispiel 82,5" error={error}>
              {(id, describedBy) => (
                <TextInput
                  id={id}
                  aria-describedby={describedBy}
                  inputMode="decimal"
                  autoComplete="off"
                  value={draft.weightKg}
                  invalid={!!error}
                  onChange={(e) => update('weightKg', e.target.value)}
                />
              )}
            </Field>
          </StepFrame>
        )}

        {step === 5 && (
          <StepFrame title="Wie würdest du deine Statur beschreiben?">
            <Field label="Statur">
              {(id, describedBy) => (
                <Select
                  id={id}
                  aria-describedby={describedBy}
                  value={draft.bodyType}
                  onChange={(e) => update('bodyType', e.target.value as BodyType)}
                >
                  {Object.entries(BODY_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field
              label="Geschätzter Körperfettanteil in %"
              optional
              hint="Nur wenn du einen Schätzwert kennst."
              error={error}
            >
              {(id, describedBy) => (
                <TextInput
                  id={id}
                  aria-describedby={describedBy}
                  inputMode="decimal"
                  autoComplete="off"
                  value={draft.bodyFatPercent}
                  invalid={!!error}
                  onChange={(e) => update('bodyFatPercent', e.target.value)}
                />
              )}
            </Field>
          </StepFrame>
        )}

        {step === 6 && (
          <StepFrame title="Wie aktiv bist du im Alltag?">
            <Field label="Alltagsbewegung">
              {(id, describedBy) => (
                <Select
                  id={id}
                  aria-describedby={describedBy}
                  value={draft.activityLevel}
                  onChange={(e) => update('activityLevel', e.target.value as ActivityLevel)}
                >
                  {Object.entries(ACTIVITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Regelmäßiges Training">
              {(id, describedBy) => (
                <Select
                  id={id}
                  aria-describedby={describedBy}
                  value={draft.trainingFrequency}
                  onChange={(e) => update('trainingFrequency', e.target.value as TrainingFrequency)}
                >
                  {Object.entries(TRAINING_FREQUENCY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </StepFrame>
        )}

        {step === 7 && (
          <StepFrame title="Wie sieht dein Alltag rund um Essen und Schlaf aus?">
            <Field
              label="Ernährung, Schlaf und typische Schwierigkeiten"
              optional
              hint="Zum Beispiel: „Abends oft Heißhunger, unter der Woche wenig Schlaf.“"
            >
              {(id, describedBy) => (
                <TextArea
                  id={id}
                  aria-describedby={describedBy}
                  rows={5}
                  value={draft.habitsNotes}
                  onChange={(e) => update('habitsNotes', e.target.value)}
                />
              )}
            </Field>
          </StepFrame>
        )}
      </div>

      <footer className="flex gap-3 pb-6 pt-4">
        {step > 1 && (
          <Button variant="secondary" className="flex-1" onClick={() => setStep((s) => s - 1)}>
            Zurück
          </Button>
        )}
        <Button className="flex-1" onClick={next}>
          {step === TOTAL_STEPS ? 'Fertig' : 'Weiter'}
        </Button>
      </footer>
    </main>
  );
}

function StepFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </div>
  );
}

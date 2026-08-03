import { useEffect, useMemo, useState } from 'react';
import { useAppData } from '../hooks/useAppData';
import {
  Button,
  Card,
  CardTitle,
  ConfirmDialog,
  Field,
  ScaleInput,
  Select,
  TextArea,
  TextInput,
} from '../components/ui';
import { EvaluationCard } from '../components/EvaluationCard';
import type { DailyEntry, Mood, Scale1to5, TrainingType } from '../domain/types';
import { MOOD_LABELS, TRAINING_LABELS } from '../domain/types';
import { todayIso } from '../domain/stats';
import { formatDateLong } from '../domain/format';
import { parseGermanNumber } from '../domain/format';
import { validateOptionalRange } from '../domain/validation';

interface FormState {
  weightKg: string;
  waistCm: string;
  sleepHours: string;
  sleepQuality: Scale1to5 | null;
  energy: Scale1to5 | null;
  hunger: Scale1to5 | null;
  mood: Mood | '';
  foodYesterday: string;
  waterLiters: string;
  trainingType: TrainingType;
  trainingMinutes: string;
  note: string;
}

const emptyForm: FormState = {
  weightKg: '',
  waistCm: '',
  sleepHours: '',
  sleepQuality: null,
  energy: null,
  hunger: null,
  mood: '',
  foodYesterday: '',
  waterLiters: '',
  trainingType: 'kein_training',
  trainingMinutes: '',
  note: '',
};

function entryToForm(entry: DailyEntry): FormState {
  const num = (v: number | undefined): string =>
    typeof v === 'number' ? String(v).replace('.', ',') : '';
  return {
    weightKg: num(entry.weightKg),
    waistCm: num(entry.waistCm),
    sleepHours: num(entry.sleepHours),
    sleepQuality: entry.sleepQuality ?? null,
    energy: entry.energy ?? null,
    hunger: entry.hunger ?? null,
    mood: entry.mood ?? '',
    foodYesterday: entry.foodYesterday ?? '',
    waterLiters: num(entry.waterLiters),
    trainingType: entry.trainingType,
    trainingMinutes: num(entry.trainingMinutes),
    note: entry.note ?? '',
  };
}

type FieldErrors = Partial<
  Record<'weightKg' | 'waistCm' | 'sleepHours' | 'waterLiters' | 'trainingMinutes', string>
>;

export function TodayPage() {
  const { entries, saveEntry, deleteEntry } = useAppData();
  const [date, setDate] = useState(todayIso());
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const existing = useMemo(() => entries.find((e) => e.date === date) ?? null, [entries, date]);

  useEffect(() => {
    setForm(existing ? entryToForm(existing) : emptyForm);
    setErrors({});
  }, [existing]);

  // Nur ein Datumswechsel setzt die Speicher-Bestätigung zurück –
  // das eigene Speichern (das `existing` aktualisiert) soll sie stehen lassen.
  useEffect(() => {
    setSaved(false);
  }, [date]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  };

  const save = async () => {
    const nextErrors: FieldErrors = {};
    const weightKg = parseGermanNumber(form.weightKg);
    const waistCm = parseGermanNumber(form.waistCm);
    const sleepHours = parseGermanNumber(form.sleepHours);
    const waterLiters = parseGermanNumber(form.waterLiters);
    const trainingMinutes = parseGermanNumber(form.trainingMinutes);

    const check = (
      key: keyof FieldErrors,
      rangeKey: Parameters<typeof validateOptionalRange>[0],
      value: number | null,
      raw: string,
    ) => {
      if (raw.trim() !== '' && value === null) {
        nextErrors[key] = 'Bitte gib eine gültige Zahl ein.';
        return;
      }
      const err = validateOptionalRange(rangeKey, value);
      if (err) nextErrors[key] = err;
    };
    check('weightKg', 'weightKg', weightKg, form.weightKg);
    check('waistCm', 'waistCm', waistCm, form.waistCm);
    check('sleepHours', 'sleepHours', sleepHours, form.sleepHours);
    check('waterLiters', 'waterLiters', waterLiters, form.waterLiters);
    check('trainingMinutes', 'trainingMinutes', trainingMinutes, form.trainingMinutes);

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const now = new Date().toISOString();
    const entry: DailyEntry = {
      date,
      trainingType: form.trainingType,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    if (weightKg !== null) entry.weightKg = weightKg;
    if (waistCm !== null) entry.waistCm = waistCm;
    if (sleepHours !== null) entry.sleepHours = sleepHours;
    if (form.sleepQuality !== null) entry.sleepQuality = form.sleepQuality;
    if (form.energy !== null) entry.energy = form.energy;
    if (form.hunger !== null) entry.hunger = form.hunger;
    if (form.mood !== '') entry.mood = form.mood;
    if (form.foodYesterday.trim() !== '') entry.foodYesterday = form.foodYesterday.trim();
    if (waterLiters !== null) entry.waterLiters = waterLiters;
    if (trainingMinutes !== null) entry.trainingMinutes = trainingMinutes;
    if (form.note.trim() !== '') entry.note = form.note.trim();

    await saveEntry(entry);
    setSaved(true);
  };

  const remove = async () => {
    setConfirmDelete(false);
    await deleteEntry(date);
    setForm(emptyForm);
  };

  return (
    <main className="p-4">
      <header className="mb-4 pt-2">
        <h1 className="text-xl font-bold">Heute</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{formatDateLong(date)}</p>
      </header>

      <Card className="mb-4">
        <CardTitle>Täglicher Check-in</CardTitle>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          noValidate
        >
          <Field label="Datum">
            {(id, describedBy) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                type="date"
                value={date}
                max={todayIso()}
                onChange={(e) => setDate(e.target.value)}
              />
            )}
          </Field>

          <Field
            label="Gewicht in kg"
            optional
            hint="Am besten morgens, nach dem Aufstehen."
            error={errors.weightKg ?? null}
          >
            {(id, describedBy) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                inputMode="decimal"
                autoComplete="off"
                placeholder="z. B. 82,4"
                value={form.weightKg}
                invalid={!!errors.weightKg}
                onChange={(e) => update('weightKg', e.target.value)}
              />
            )}
          </Field>

          <Field label="Bauchumfang in cm" optional error={errors.waistCm ?? null}>
            {(id, describedBy) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                inputMode="decimal"
                autoComplete="off"
                placeholder="z. B. 96,5"
                value={form.waistCm}
                invalid={!!errors.waistCm}
                onChange={(e) => update('waistCm', e.target.value)}
              />
            )}
          </Field>

          <Field label="Schlafdauer in Stunden" optional error={errors.sleepHours ?? null}>
            {(id, describedBy) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                inputMode="decimal"
                autoComplete="off"
                placeholder="z. B. 7,5"
                value={form.sleepHours}
                invalid={!!errors.sleepHours}
                onChange={(e) => update('sleepHours', e.target.value)}
              />
            )}
          </Field>

          <ScaleInput
            label="Schlafqualität"
            value={form.sleepQuality}
            onChange={(v) => update('sleepQuality', v)}
            lowLabel="sehr schlecht"
            highLabel="sehr gut"
          />
          <ScaleInput
            label="Energie"
            value={form.energy}
            onChange={(v) => update('energy', v)}
            lowLabel="sehr niedrig"
            highLabel="sehr hoch"
          />
          <ScaleInput
            label="Hunger"
            value={form.hunger}
            onChange={(v) => update('hunger', v)}
            lowLabel="kaum"
            highLabel="sehr stark"
          />

          <Field label="Stimmung" optional>
            {(id, describedBy) => (
              <Select
                id={id}
                aria-describedby={describedBy}
                value={form.mood}
                onChange={(e) => update('mood', e.target.value as Mood | '')}
              >
                <option value="">Keine Angabe</option>
                {Object.entries(MOOD_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field
            label="Essen und Getränke gestern"
            optional
            hint="Freitext genügt – Stichworte reichen völlig."
          >
            {(id, describedBy) => (
              <TextArea
                id={id}
                aria-describedby={describedBy}
                rows={3}
                value={form.foodYesterday}
                onChange={(e) => update('foodYesterday', e.target.value)}
              />
            )}
          </Field>

          <Field label="Wasseraufnahme in Litern" optional error={errors.waterLiters ?? null}>
            {(id, describedBy) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                inputMode="decimal"
                autoComplete="off"
                placeholder="z. B. 2"
                value={form.waterLiters}
                invalid={!!errors.waterLiters}
                onChange={(e) => update('waterLiters', e.target.value)}
              />
            )}
          </Field>

          <Field label="Training">
            {(id, describedBy) => (
              <Select
                id={id}
                aria-describedby={describedBy}
                value={form.trainingType}
                onChange={(e) => update('trainingType', e.target.value as TrainingType)}
              >
                {Object.entries(TRAINING_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          {form.trainingType !== 'kein_training' && (
            <Field
              label="Trainingsdauer in Minuten"
              optional
              error={errors.trainingMinutes ?? null}
            >
              {(id, describedBy) => (
                <TextInput
                  id={id}
                  aria-describedby={describedBy}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="z. B. 45"
                  value={form.trainingMinutes}
                  invalid={!!errors.trainingMinutes}
                  onChange={(e) => update('trainingMinutes', e.target.value)}
                />
              )}
            </Field>
          )}

          <Field label="Notiz" optional>
            {(id, describedBy) => (
              <TextArea
                id={id}
                aria-describedby={describedBy}
                rows={2}
                value={form.note}
                onChange={(e) => update('note', e.target.value)}
              />
            )}
          </Field>

          <div className="flex flex-col gap-2">
            <Button type="submit">{existing ? 'Änderungen speichern' : 'Eintrag speichern'}</Button>
            {existing && (
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                Eintrag löschen
              </Button>
            )}
          </div>
          {saved && (
            <p role="status" className="mt-3 text-sm font-medium text-teal-700 dark:text-teal-300">
              Gespeichert – deine Auswertung steht unten.
            </p>
          )}
        </form>
      </Card>

      {existing && <EvaluationCard entry={existing} entries={entries} />}

      <ConfirmDialog
        open={confirmDelete}
        title="Eintrag löschen?"
        message={`Der Eintrag vom ${formatDateLong(date)} wird dauerhaft entfernt.`}
        confirmLabel="Ja, löschen"
        onConfirm={() => void remove()}
        onCancel={() => setConfirmDelete(false)}
      />
    </main>
  );
}

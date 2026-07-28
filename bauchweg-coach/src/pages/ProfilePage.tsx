import { useRef, useState } from 'react';
import { useAppData } from '../hooks/useAppData';
import { useTheme, type ThemeSetting } from '../hooks/useTheme';
import {
  Button,
  Card,
  CardTitle,
  ConfirmDialog,
  Field,
  Select,
  TextArea,
  TextInput,
} from '../components/ui';
import type { ActivityLevel, BodyType, Gender, Profile, TrainingFrequency } from '../domain/types';
import {
  ACTIVITY_LABELS,
  BODY_TYPE_LABELS,
  GENDER_LABELS,
  TRAINING_FREQUENCY_LABELS,
} from '../domain/types';
import { parseGermanNumber } from '../domain/format';
import { validateOptionalRange, validateRange } from '../domain/validation';
import { buildExportCsv, buildExportJson, parseImportJson } from '../domain/exportImport';
import { buildDemoEntries } from '../domain/demoData';

function download(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

type ProfileErrors = Partial<
  Record<'age' | 'heightCm' | 'startWeightKg' | 'bodyFatPercent', string>
>;

export function ProfilePage() {
  const { profile, entries, saveProfile, saveEntries, deleteAllData } = useAppData();
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState(() => ({
    gender: profile?.gender ?? 'keine_angabe',
    age: profile ? String(profile.age) : '',
    heightCm: profile ? String(profile.heightCm).replace('.', ',') : '',
    startWeightKg: profile ? String(profile.startWeightKg).replace('.', ',') : '',
    bodyType: profile?.bodyType ?? 'keine_angabe',
    bodyFatPercent:
      profile?.bodyFatPercent !== undefined ? String(profile.bodyFatPercent).replace('.', ',') : '',
    activityLevel: profile?.activityLevel ?? 'leicht_aktiv',
    trainingFrequency: profile?.trainingFrequency ?? 'selten',
    habitsNotes: profile?.habitsNotes ?? '',
  }));
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [status, setStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [confirmDemo, setConfirmDemo] = useState(false);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setStatus(null);
  };

  const saveProfileForm = async () => {
    const nextErrors: ProfileErrors = {};
    const age = parseGermanNumber(form.age);
    const heightCm = parseGermanNumber(form.heightCm);
    const startWeightKg = parseGermanNumber(form.startWeightKg);
    const bodyFatPercent = parseGermanNumber(form.bodyFatPercent);

    const ageErr = validateRange('age', age);
    if (ageErr) nextErrors.age = ageErr;
    const heightErr = validateRange('heightCm', heightCm);
    if (heightErr) nextErrors.heightCm = heightErr;
    const weightErr = validateRange('weightKg', startWeightKg);
    if (weightErr) nextErrors.startWeightKg = weightErr;
    const fatErr = validateOptionalRange('bodyFatPercent', bodyFatPercent);
    if (fatErr && form.bodyFatPercent.trim() !== '') nextErrors.bodyFatPercent = fatErr;

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const next: Profile = {
      gender: form.gender as Gender,
      age: age ?? 0,
      heightCm: heightCm ?? 0,
      startWeightKg: startWeightKg ?? 0,
      bodyType: form.bodyType as BodyType,
      activityLevel: form.activityLevel as ActivityLevel,
      trainingFrequency: form.trainingFrequency as TrainingFrequency,
      habitsNotes: form.habitsNotes.trim(),
      createdAt: profile?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (bodyFatPercent !== null) next.bodyFatPercent = bodyFatPercent;
    await saveProfile(next);
    setStatus('Profil gespeichert.');
  };

  const exportJson = () => {
    download(
      `bauchweg-coach-export-${new Date().toISOString().slice(0, 10)}.json`,
      buildExportJson(profile, entries),
      'application/json',
    );
  };

  const exportCsv = () => {
    download(
      `bauchweg-coach-export-${new Date().toISOString().slice(0, 10)}.csv`,
      buildExportCsv(entries),
      'text/csv;charset=utf-8',
    );
  };

  const importJson = async (file: File) => {
    setImportError(null);
    try {
      const text = await file.text();
      const result = parseImportJson(text);
      if (result.profile) await saveProfile(result.profile);
      if (result.entries.length > 0) await saveEntries(result.entries);
      setStatus(
        `Import abgeschlossen: ${result.entries.length} Einträge${result.profile ? ' und Profil' : ''} übernommen.`,
      );
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Import fehlgeschlagen.');
    }
  };

  const loadDemoData = async () => {
    setConfirmDemo(false);
    const demo = buildDemoEntries();
    await saveEntries(demo);
    setStatus('30 Tage Demo-Daten geladen. Demo-Einträge sind entsprechend markiert.');
  };

  const deleteAll = async () => {
    setConfirmDeleteAll(false);
    await deleteAllData();
  };

  return (
    <main className="p-4">
      <header className="mb-4 pt-2">
        <h1 className="text-xl font-bold">Profil &amp; Daten</h1>
      </header>

      {status && (
        <p
          role="status"
          className="mb-4 rounded-xl bg-teal-50 p-3 text-sm font-medium text-teal-800 dark:bg-slate-800 dark:text-teal-300"
        >
          {status}
        </p>
      )}

      <Card className="mb-4">
        <CardTitle>Deine Angaben</CardTitle>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void saveProfileForm();
          }}
          noValidate
        >
          <Field label="Geschlecht" optional>
            {(id, describedBy) => (
              <Select
                id={id}
                aria-describedby={describedBy}
                value={form.gender}
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
          <Field label="Alter in Jahren" error={errors.age ?? null}>
            {(id, describedBy) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                inputMode="numeric"
                value={form.age}
                invalid={!!errors.age}
                onChange={(e) => update('age', e.target.value)}
              />
            )}
          </Field>
          <Field label="Körpergröße in cm" error={errors.heightCm ?? null}>
            {(id, describedBy) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                inputMode="numeric"
                value={form.heightCm}
                invalid={!!errors.heightCm}
                onChange={(e) => update('heightCm', e.target.value)}
              />
            )}
          </Field>
          <Field label="Startgewicht in kg" error={errors.startWeightKg ?? null}>
            {(id, describedBy) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                inputMode="decimal"
                value={form.startWeightKg}
                invalid={!!errors.startWeightKg}
                onChange={(e) => update('startWeightKg', e.target.value)}
              />
            )}
          </Field>
          <Field label="Statur">
            {(id, describedBy) => (
              <Select
                id={id}
                aria-describedby={describedBy}
                value={form.bodyType}
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
            error={errors.bodyFatPercent ?? null}
          >
            {(id, describedBy) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                inputMode="decimal"
                value={form.bodyFatPercent}
                invalid={!!errors.bodyFatPercent}
                onChange={(e) => update('bodyFatPercent', e.target.value)}
              />
            )}
          </Field>
          <Field label="Alltagsbewegung">
            {(id, describedBy) => (
              <Select
                id={id}
                aria-describedby={describedBy}
                value={form.activityLevel}
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
                value={form.trainingFrequency}
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
          <Field label="Ernährung, Schlaf und typische Schwierigkeiten" optional>
            {(id, describedBy) => (
              <TextArea
                id={id}
                aria-describedby={describedBy}
                rows={4}
                value={form.habitsNotes}
                onChange={(e) => update('habitsNotes', e.target.value)}
              />
            )}
          </Field>
          <Button type="submit" className="w-full">
            Profil speichern
          </Button>
        </form>
      </Card>

      <Card className="mb-4">
        <CardTitle>Darstellung</CardTitle>
        <Field label="Erscheinungsbild">
          {(id, describedBy) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              value={theme}
              onChange={(e) => setTheme(e.target.value as ThemeSetting)}
            >
              <option value="system">Automatisch (Systemeinstellung)</option>
              <option value="hell">Hell</option>
              <option value="dunkel">Dunkel</option>
            </Select>
          )}
        </Field>
      </Card>

      <Card className="mb-4">
        <CardTitle>Daten exportieren &amp; importieren</CardTitle>
        <div className="flex flex-col gap-2">
          <Button variant="secondary" onClick={exportJson}>
            Als JSON exportieren
          </Button>
          <Button variant="secondary" onClick={exportCsv}>
            Als CSV exportieren
          </Button>
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            JSON importieren
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            aria-label="JSON-Datei zum Import auswählen"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importJson(file);
              e.target.value = '';
            }}
          />
        </div>
        {importError && (
          <p role="alert" className="mt-3 text-sm text-rose-700 dark:text-rose-300">
            {importError}
          </p>
        )}
      </Card>

      <Card className="mb-4">
        <CardTitle>Demo-Daten</CardTitle>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
          Lädt 30 Tage Beispieldaten mit realistischen Schwankungen und leicht fallendem Trend.
          Bestehende Einträge an denselben Tagen werden überschrieben.
        </p>
        <Button variant="secondary" onClick={() => setConfirmDemo(true)}>
          Demo-Daten laden (Beispiel)
        </Button>
      </Card>

      <Card className="mb-4">
        <CardTitle>Daten löschen</CardTitle>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
          Einzelne Einträge löschst du unter „Heute“ über die Datumsauswahl.
        </p>
        <Button variant="danger" className="w-full" onClick={() => setConfirmDeleteAll(true)}>
          Alle Daten löschen
        </Button>
      </Card>

      <Card>
        <CardTitle>Hinweise</CardTitle>
        <p className="mb-2 text-sm text-slate-600 dark:text-slate-300">
          🔒 Alle Daten bleiben auf diesem Gerät. Es gibt keine Registrierung, keine Cloud und keine
          Weitergabe an Dritte.
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Diese App ersetzt keine medizinische Beratung. Bei gesundheitlichen Fragen wende dich an
          ärztliches Fachpersonal.
        </p>
      </Card>

      <ConfirmDialog
        open={confirmDemo}
        title="Demo-Daten laden?"
        message="Es werden 30 Tage Beispieldaten eingefügt. Einträge an denselben Tagen werden überschrieben."
        confirmLabel="Ja, Demo-Daten laden"
        onConfirm={() => void loadDemoData()}
        onCancel={() => setConfirmDemo(false)}
      />
      <ConfirmDialog
        open={confirmDeleteAll}
        title="Wirklich alle Daten löschen?"
        message="Profil und sämtliche Einträge werden dauerhaft von diesem Gerät entfernt. Das kann nicht rückgängig gemacht werden. Exportiere vorher bei Bedarf deine Daten."
        confirmLabel="Ja, alles löschen"
        onConfirm={() => void deleteAll()}
        onCancel={() => setConfirmDeleteAll(false)}
      />
    </main>
  );
}

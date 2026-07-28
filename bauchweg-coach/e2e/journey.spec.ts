import { expect, test } from '@playwright/test';

/**
 * Kernreise: Onboarding abschließen → Tageswert eintragen → Auswertung sehen → Verlauf öffnen.
 */
test('Onboarding, Check-in, Auswertung und Verlauf', async ({ page }) => {
  await page.goto('/');

  // --- Onboarding: 7 Fragen ---
  await expect(page.getByText('Frage 1 von 7')).toBeVisible();
  await page.getByLabel('Geschlecht').selectOption('maennlich');
  await page.getByRole('button', { name: 'Weiter' }).click();

  await expect(page.getByText('Frage 2 von 7')).toBeVisible();
  await page.getByLabel('Alter in Jahren').fill('42');
  await page.getByRole('button', { name: 'Weiter' }).click();

  await expect(page.getByText('Frage 3 von 7')).toBeVisible();
  await page.getByLabel('Körpergröße in cm').fill('181');
  await page.getByRole('button', { name: 'Weiter' }).click();

  await expect(page.getByText('Frage 4 von 7')).toBeVisible();
  await page.getByLabel('Gewicht in kg').fill('84,5');
  await page.getByRole('button', { name: 'Weiter' }).click();

  await expect(page.getByText('Frage 5 von 7')).toBeVisible();
  await page.getByLabel('Statur').selectOption('mittel');
  await page.getByRole('button', { name: 'Weiter' }).click();

  await expect(page.getByText('Frage 6 von 7')).toBeVisible();
  await page.getByLabel('Alltagsbewegung').selectOption('leicht_aktiv');
  await page.getByLabel('Regelmäßiges Training').selectOption('1_2_pro_woche');
  await page.getByRole('button', { name: 'Weiter' }).click();

  await expect(page.getByText('Frage 7 von 7')).toBeVisible();
  await page
    .getByLabel(/Ernährung, Schlaf/)
    .fill('Abends oft Heißhunger, unter der Woche wenig Schlaf.');
  await page.getByRole('button', { name: 'Fertig' }).click();

  // --- Heute: Check-in ausfüllen ---
  await expect(page.getByRole('heading', { name: 'Heute', level: 1 })).toBeVisible();
  await page.getByLabel(/Gewicht in kg/).fill('84,2');
  await page.getByLabel(/Schlafdauer in Stunden/).fill('7,5');
  await page.getByRole('radio', { name: 'Schlafqualität: 4 von 5' }).click();
  await page.getByRole('radio', { name: 'Energie: 3 von 5' }).click();
  await page.getByRole('radio', { name: 'Hunger: 2 von 5' }).click();
  await page.getByLabel(/Essen und Getränke gestern/).fill('Müsli, Salat, abends Pizza');
  await page.getByLabel('Training', { exact: true }).selectOption('krafttraining');
  await page.getByLabel(/Trainingsdauer in Minuten/).fill('50');
  await page.getByRole('button', { name: 'Eintrag speichern' }).click();

  // --- Tagesauswertung sichtbar ---
  await expect(page.getByText('Gespeichert – deine Auswertung steht unten.')).toBeVisible();
  const evaluation = page.getByTestId('evaluation-card');
  await expect(evaluation).toBeVisible();
  await expect(evaluation.getByText('Deine Tagesauswertung')).toBeVisible();
  await expect(evaluation.getByText('Tagesampel')).toBeVisible();
  await expect(evaluation.getByText('Dein Tagesfokus')).toBeVisible();
  // Die Pizza im Freitext darf nur als Möglichkeit erwähnt werden.
  await expect(evaluation.getByText(/könnte .*Wasser/)).toBeVisible();

  // --- Verlauf öffnen ---
  await page.getByRole('link', { name: 'Verlauf' }).click();
  await expect(page.getByRole('heading', { name: 'Verlauf', level: 1 })).toBeVisible();
  await expect(page.getByText('Gewicht', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '7 Tage' }).click();
  await expect(page.getByRole('button', { name: '7 Tage' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

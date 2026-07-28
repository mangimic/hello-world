import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CoachPage } from './CoachPage';

describe('CoachPage (Heißhunger-Hilfe)', () => {
  it('zeigt die Auslöser-Frage mit allen sechs Optionen', () => {
    render(<CoachPage />);
    expect(screen.getByText('Was trifft gerade am ehesten zu?')).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(6);
    expect(screen.getByRole('radio', { name: 'Echter körperlicher Hunger' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Weiß ich nicht' })).toBeInTheDocument();
  });

  it('zeigt nach Auswahl eines Auslösers 2–3 neutrale Optionen', async () => {
    const user = userEvent.setup();
    render(<CoachPage />);
    await user.click(screen.getByRole('radio', { name: 'Stress' }));
    const list = await screen.findByTestId('craving-options');
    const items = list.querySelectorAll('li');
    expect(items.length).toBeGreaterThanOrEqual(2);
    expect(items.length).toBeLessThanOrEqual(3);
    expect(list.textContent?.toLowerCase()).not.toContain('schlecht');
  });

  it('lässt sich zurücksetzen', async () => {
    const user = userEvent.setup();
    render(<CoachPage />);
    await user.click(screen.getByRole('radio', { name: 'Müdigkeit' }));
    await user.click(screen.getByRole('button', { name: 'Zurücksetzen' }));
    expect(screen.queryByTestId('craving-options')).not.toBeInTheDocument();
  });
});

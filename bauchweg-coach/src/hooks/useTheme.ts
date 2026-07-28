import { useCallback, useEffect, useState } from 'react';

export type ThemeSetting = 'system' | 'hell' | 'dunkel';

const STORAGE_KEY = 'bauchweg-theme';

function readStoredTheme(): ThemeSetting {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'hell' || stored === 'dunkel' || stored === 'system') return stored;
  } catch {
    // localStorage nicht verfügbar (z. B. Private Mode) – Standard verwenden.
  }
  return 'system';
}

function applyTheme(setting: ThemeSetting) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = setting === 'dunkel' || (setting === 'system' && prefersDark);
  document.documentElement.classList.toggle('dark', dark);
}

export function useTheme(): { theme: ThemeSetting; setTheme: (t: ThemeSetting) => void } {
  const [theme, setThemeState] = useState<ThemeSetting>(readStoredTheme);

  useEffect(() => {
    applyTheme(theme);
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => applyTheme(theme);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [theme]);

  const setTheme = useCallback((next: ThemeSetting) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ohne localStorage gilt die Einstellung nur für die Sitzung.
    }
  }, []);

  return { theme, setTheme };
}

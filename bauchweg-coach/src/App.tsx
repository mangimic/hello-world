import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAppData } from './hooks/useAppData';
import { BottomNav } from './components/BottomNav';
import { OnboardingPage } from './pages/OnboardingPage';
import { TodayPage } from './pages/TodayPage';
import { CoachPage } from './pages/CoachPage';
import { ProfilePage } from './pages/ProfilePage';

// Recharts ist groß – die Verlaufsseite wird erst bei Bedarf geladen.
const HistoryPage = lazy(() =>
  import('./pages/HistoryPage').then((m) => ({ default: m.HistoryPage })),
);

export default function App() {
  const { ready, profile } = useAppData();

  if (!ready) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p role="status" className="text-slate-500 dark:text-slate-400">
          Lade Daten …
        </p>
      </main>
    );
  }

  if (!profile) {
    return <OnboardingPage />;
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg pb-20">
      <Routes>
        <Route path="/heute" element={<TodayPage />} />
        <Route path="/coach" element={<CoachPage />} />
        <Route
          path="/verlauf"
          element={
            <Suspense
              fallback={
                <p role="status" className="p-4 text-slate-500 dark:text-slate-400">
                  Lade Verlauf …
                </p>
              }
            >
              <HistoryPage />
            </Suspense>
          }
        />
        <Route path="/profil" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/heute" replace />} />
      </Routes>
      <BottomNav />
    </div>
  );
}

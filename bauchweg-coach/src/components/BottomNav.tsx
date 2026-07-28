import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/heute', label: 'Heute', icon: '☀️' },
  { to: '/coach', label: 'Coach', icon: '💬' },
  { to: '/verlauf', label: 'Verlauf', icon: '📈' },
  { to: '/profil', label: 'Profil', icon: '👤' },
];

export function BottomNav() {
  return (
    <nav
      aria-label="Hauptnavigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-slate-800 dark:bg-slate-900"
    >
      <ul className="mx-auto flex max-w-lg">
        {tabs.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              className={({ isActive }) =>
                `flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                  isActive
                    ? 'text-teal-700 dark:text-teal-300'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`
              }
            >
              <span aria-hidden="true" className="text-lg leading-none">
                {tab.icon}
              </span>
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

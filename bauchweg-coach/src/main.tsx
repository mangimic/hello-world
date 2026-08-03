import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { AppDataProvider } from './hooks/useAppData';
import './index.css';

registerSW({ immediate: true });

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root-Element nicht gefunden.');

createRoot(rootElement).render(
  <StrictMode>
    <HashRouter>
      <AppDataProvider>
        <App />
      </AppDataProvider>
    </HashRouter>
  </StrictMode>,
);

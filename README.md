# Apps in diesem Repository

Dieses Repository enthält mehrere eigenständige, komplett lokale Web-Apps
(PWAs, offline nutzbar, keine Anmeldung, keine Server-Anbindung). Jede App
liegt in ihrem eigenen Ordner:

| Ordner | App | Inhalt |
| --- | --- | --- |
| [`lernprofi/`](./lernprofi/) | ✏️ **Lernprofi** | Deutsch-Lern-App für die 3./4. Klasse – Einzeldatei-PWA inkl. Doku, Tests und Tools |
| [`bauchweg-coach/`](./bauchweg-coach/) | ⚖️ **BauchWeg Coach** (Quellcode) | React/TypeScript/Vite-Projekt mit Tests – siehe [README](./bauchweg-coach/README.md) |
| [`bauchweg/`](./bauchweg/) | ⚖️ **BauchWeg Coach** (Build) | Fertiger Production-Build, der von GitHub Pages ausgeliefert wird |

## Veröffentlichte Adressen (GitHub Pages)

- **Lernprofi:** `…/lernprofi/` – die bisherige Root-Adresse leitet automatisch
  dorthin weiter, bestehende Lesezeichen und installierte Apps funktionieren
  weiter.
- **BauchWeg Coach:** `…/bauchweg/`

## App aktualisieren

- **Lernprofi:** Dateien in `lernprofi/` direkt bearbeiten (Einzeldatei-App).
- **BauchWeg Coach:** in `bauchweg-coach/` entwickeln, dann
  `npm run deploy:pages` ausführen (baut und aktualisiert `bauchweg/`).

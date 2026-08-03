# Apps in diesem Repository

Dieses Repository enthält mehrere eigenständige, komplett lokale Web-Apps
(PWAs, offline nutzbar, keine Anmeldung, keine Server-Anbindung). Jede App
liegt in ihrem eigenen Ordner:

| Ordner | App | Inhalt |
| --- | --- | --- |
| [`lernprofi/`](./lernprofi/) | ✏️ **Lernprofi** | Deutsch-Lern-App für die 3./4. Klasse (inkl. 🦖 Leons Spielewelt) – Einzeldatei-PWA mit Doku, Tests und Tools |
| [`felix/`](./felix/) | 🏝 **Apfel-Insel** | Überlebens-Spiel mit 100 Leveln (ab ca. 8 Jahre) – Einzeldatei-PWA, siehe [README](./felix/README.md) |
| [`bauchweg-coach/`](./bauchweg-coach/) | ⚖️ **BauchWeg Coach** (Quellcode) | React/TypeScript/Vite-Projekt mit Tests – siehe [README](./bauchweg-coach/README.md) |
| [`bauchweg/`](./bauchweg/) | ⚖️ **BauchWeg Coach** (Build) | Fertiger Production-Build, der von GitHub Pages ausgeliefert wird |

## Veröffentlichte Adressen (GitHub Pages)

- **Lernprofi:** `…/lernprofi/` – die bisherige Root-Adresse leitet automatisch
  dorthin weiter, bestehende Lesezeichen und installierte Apps funktionieren
  weiter.
- **Apfel-Insel:** `…/felix/`
- **BauchWeg Coach:** `…/bauchweg/`

## App aktualisieren

- **Lernprofi:** Dateien in `lernprofi/` direkt bearbeiten (Einzeldatei-App).
- **Apfel-Insel:** Dateien in `felix/` direkt bearbeiten;
  Smoke-Test: `node felix/tests/felix-smoke.js`.
- **BauchWeg Coach:** in `bauchweg-coach/` entwickeln, dann
  `npm run deploy:pages` ausführen (baut und aktualisiert `bauchweg/`).

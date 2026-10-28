# BauchWeg Coach – Design System (MASTER)

> Quelle: Projekt-Skill `ui-ux-pro-max` (`.claude/skills/ui-ux-pro-max`).
> Die automatischen `--design-system`-Bundles passten nicht zum Produkt
> (Landing-Page-Pattern, rote bzw. verspielte Claymorphism-Vorschläge).
> Dieses Master wurde daher aus **verifizierten Einzel-Domain-Treffern**
> zusammengesetzt (Query-Contract des Skills, Modus 2).

## Produktkontext

Ruhige, erwachsene Gesundheits-/Wellness-App (täglicher Check-in, lokale
Daten). Keine Fitness-Bodybuilder-Ästhetik, keine aggressiven Warnflächen.

## Stil

**Minimalism & Swiss Style** (`--domain style`, Treffer `minimalism-and-swiss-style`)
– clean, viel Weißraum, klare Typo-Hierarchie, Karten ohne Dekoration.
Light + Dark unterstützt; Accessibility-Auflagen: Kontrast 4,5:1, Tastatur,
sichtbarer Fokus, `prefers-reduced-motion`.

## Farben

**Healthcare App – „Calm cyan + health green“** (`--domain color`).
Umsetzung über die Standard-Tailwind-Stufen derselben Hues:

| Rolle | Wert | Verwendung |
| --- | --- | --- |
| Primary | `#0891b2` (cyan-600) | Ring/Fokus, Akzente |
| Primary (interaktiv) | `#0e7490` (cyan-700) | Buttons mit weißem Text (Kontrast ≥ 4,5:1) |
| Accent (Gesundheit) | `#059669`/`#047857` (emerald-600/700) | Positive Signale (Ampel „Gut“, Speicher-Bestätigung) |
| Background | `#ecfeff` (cyan-50, abgeschwächt) | Seitenhintergrund hell |
| Foreground | `slate-900` / `slate-100` | Text hell/dunkel |
| Destruktiv | `rose-700` (Rahmen statt Fläche) | Löschen – bewusst keine rote Vollfläche |

Diagramme behalten die separat CVD-validierte Palette (`--chart-1/2`).

## Typografie

**Lora / Raleway** (`--domain typography`, „Best For: Health apps, wellness“):
- `--font-display: 'Lora'` – Überschriften (h1, h2)
- `--font-sans: 'Raleway'` – Fließtext und UI

Lokal eingebettet als variable WOFF2 (Latin) unter `public/fonts/` –
keine externen Anfragen, offline nutzbar, vom Service Worker vorgecacht.

## Interaktion (Pre-Delivery-Checkliste des Skills)

- SVG-Icons (Heroicons-Pfade) statt Emojis in der Navigation
- `cursor-pointer` auf allen klickbaren Elementen
- Übergänge 200 ms; `prefers-reduced-motion` deaktiviert CSS-Transitions
  und Recharts-Animationen
- Touch-Flächen min. 48 px (`min-h-12`), sichtbarer Fokusring (cyan-600)
- Mobile-first, kein horizontales Scrollen, Safe-Area-Insets

## Seiten-Overrides

Keine – alle vier Bereiche (Heute, Coach, Verlauf, Profil) nutzen dieses
Master unverändert. Neue Seiten: zuerst dieses Dokument lesen, Overrides
als `pages/<name>.md` daneben ablegen.

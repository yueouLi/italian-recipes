# Cucina Italiana — Designdokumentation

Vanilla HTML/CSS/JS, keine Build-Tools, keine Dependencies. Läuft direkt im Browser.

---

## Projektstruktur

```
cucina-italiana/
├── index.html              # Einzige Seite (SPA-artig)
├── style.css               # Gesamtes Styling
├── app.js                  # Gesamte Logik
├── recipes.json            # Rohdaten aus Kochbuch
├── recipes-processed.json  # Verarbeitete Daten mit Keywords, Kategorien
├── recipes-en.json         # Englische Übersetzungen
├── recipes-zh.json         # Chinesische Übersetzungen
└── DESIGN.md               # Diese Datei
```

---

## Designsystem

### Farben

```css
--red:        #e8472e   /* Primärfarbe, Buttons, Logo-Akzent */
--red-dark:   #c93820   /* Hover-Zustand */
--text:       #1d1d1f   /* Apple-Grau, nicht reines Schwarz */
--text-mid:   #6e6e73
--text-light: #aeaeb2
--bg:         #f5f5f7   /* Seiten-Hintergrund */
--card:       #ffffff
--border:     #e5e5ea
```

Filter-Chips haben je eine eigene Akzentfarbe, farbkodiert pro Gruppe:

| Gruppe      | Farbe    | CSS-Var    |
|-------------|----------|------------|
| Kategorie   | Rot      | `--red`    |
| Schwierigkeit | Anthrazit | `--text` |
| Zeit        | Teal     | `--teal`   |
| Stimmung    | Lila     | `--purple` |
| Anlass      | Orange   | `--orange` |
| Protein     | Grün     | `--green`  |
| Meine Rezepte | Pink   | `--pink`   |

### Typografie

Apple-Systemfont-Stack: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif`

Kein Google Fonts, kein externer Font-Load. Sofort, kein FOUT.

### Radien

- `--radius: 12px` — Inputs, kleinere Elemente
- `--radius-lg: 20px` — Cards, Search-Bereich

---

## Features

### Zutaten-Matching

Nutzer gibt Zutaten ein (Enter oder `+`-Button), jede als Tag angezeigt. Klick auf `Rezepte finden` aktiviert Match-Modus.

Score-Algorithmus (`scoreRecipe`):
- Vergleicht Suchbegriffe gegen vorberechnete `keywords[]` pro Rezept
- Exact-match oder word-boundary match (ab 3 Zeichen)
- Ergebnis: Anteil gefundener Zutaten (0–1)
- Cards sortiert nach Score, Score als Balken angezeigt

Keywords werden beim Laden aus den Zutaten extrahiert (`extractKeywords`):
- Zahlen, Einheiten und Stoppwörter entfernt
- Dedupliziert

### Filter-System

7 Filter-Gruppen, alle kombinierbar:

- **Kategorie**: Antipasti, Pasta, Risotto, Suppe, Fisch, Fleisch, Gemüse, Dessert, Sonstiges
- **Schwierigkeit**: Einfach, Mittel, Schwer
- **Zeit**: unter 30 Min, unter 1 Std, unter 2 Std
- **Stimmung**: Schnell, Comfort Food, Leicht & Frisch, Besonders
- **Anlass**: Unter der Woche, Sonntagsgericht, Familie, Für Gäste
- **Protein**: Vegetarisch, Fisch, Fleisch, Meeresfrüchte
- **Meine Rezepte**: Eigene, Gekocht, Favoriten, Bewertet

Stimmung, Anlass und Protein werden **automatisch erkannt**, falls nicht explizit gesetzt — aus Zutaten, Kategorie, Schwierigkeit und Zeit.

```js
detectProtein(name, category, ingredients)  // Wortlisten-Matching
detectMood(category, difficulty, totalTime)  // Regelbasiert
detectOccasion(difficulty, totalTime, servings)
```

### Portionsrechner

Im Detail-Modal: `−` / `+` Stepper (1–20 Portionen).

`scaleIngredient(ing, portions, base)`:
- Parst Bruchzahlen (`3/4`, `1 1/2`) und Dezimalzahlen
- Intelligente Rundung: ≥100 → auf 10er, ≥10 → ganzzahlig, sonst auf 0.25
- Unterteilbare Zutaten (Eier, Knoblauchzehen, Zwiebeln) → `Math.ceil`, nie Brüche

`scaleStepText(text, portions, base)`:
- Skaliert Mengenangaben mit Einheiten im Fließtext (g, kg, ml, l etc.)
- Temperatur und Zeit (°C, Min, Std) werden **nicht** skaliert

### Mehrsprachigkeit (i18n)

3 Sprachen: Deutsch (Default), Englisch, Chinesisch.

Architektur:
- `I18N`-Objekt mit allen UI-Strings in app.js
- `data-i18n="key"` auf HTML-Elementen
- `data-i18n-html="1"` für HTML-Content (z.B. `<em>`)
- `data-i18n-attr="placeholder"` für Attribute

Sprache gespeichert in localStorage (`cucina_lang`). Auto-Detection beim ersten Besuch: Browser-Sprache.

Rezeptinhalte (Namen, Zutaten, Schritte) kommen aus separaten JSON-Dateien:
- `recipes-en.json` — Keys = deutsche Rezeptnamen, Values = übersetzte Felder
- `recipes-zh.json` — gleiche Struktur für Chinesisch
- Fallback auf deutschen Originaltext wenn Übersetzung fehlt

### Foto-Upload

Fotos werden **nicht** in localStorage gespeichert (Quota-Problem). Stattdessen **IndexedDB** via `PhotoDB`:

```js
PhotoDB.set(name, dataUrl)  // name = Rezeptname als Key
PhotoDB.get(name)
PhotoDB.getAll()            // einmal beim Start, dann in-memory
```

Vor dem Speichern: Komprimierung via Canvas-API auf max. 800×500px, JPEG 75%.

Upload möglich: im Detail-Modal (bestehende Rezepte) und im Add-Formular (neue Rezepte).

### Eigene Rezepte hinzufügen

FAB (`+` Button unten rechts) öffnet Modal mit zwei Tabs:

**Manuell**: Name (DE + IT), Kategorie, Schwierigkeit, Portionen, Vorbereitungs-/Kochzeit, Zutaten (je Zeile), Schritte, Tipps, Foto.

**Markdown-Import**: Drag & Drop oder Datei-Picker für `.md`/`.txt`. Parser (`parseMd`) erkennt:
- `# Titel` → Name
- `*kursiv*` → Italienischer Name
- `## Zutaten` / `## Zubereitung` / `## Tipp` → Abschnitte
- Portionen und Schwierigkeit aus Fließtext

Gespeichert in localStorage (`cucina_user`). `_user: true` Flag für Eigene-Rezepte-Filter.

### Persistenz (localStorage)

| Key              | Inhalt                          |
|------------------|---------------------------------|
| `cucina_user`    | Array eigener Rezepte           |
| `cucina_cooked`  | Array von Rezeptnamen (gekocht) |
| `cucina_ratings` | Objekt `{name: 1-5}`            |
| `cucina_lang`    | Aktuelle Sprache                |

QuotaExceededError wird abgefangen, kein uncaught exception.

### Bewertung & Gekocht-Status

Im Detail-Modal:
- Gekocht-Toggle-Button, wechselt zwischen leer und `✓ Schon gekocht`
- 5-Sterne-Rating, click auf gleiche Zahl = Reset auf 0
- Beides in localStorage, spiegelt sich in Card-Ansicht (Badge + Sterne)

---

## Performance

- **DocumentFragment** für Grid-Rendering — keine repetitiven DOM-Appends
- **recipeIndexMap** (Map) für O(1) Lookup von Rezept-Index statt O(n) findIndex
- Animations-Delay auf Cards gecappt bei 20 Items (`Math.min(i, 20) * 0.03s`)
- Übersetzungen parallel geladen (`Promise.all`)
- Fotos lazy: erst beim Öffnen des Modals aus in-memory `photos`-Objekt

---

## Accessibility

- Skip-Nav Link (`#main-content`)
- Alle interaktiven Elemente mit `aria-label`
- Filter-Gruppen mit `role="group"`
- Grid mit `role="list"`, Cards mit `role="button"`
- Overlay-Modal mit `role="dialog" aria-modal="true"`
- Fokus beim Öffnen auf Close-Button
- Keyboard: Enter/Space für Cards und Chips, Escape schließt Modals
- `focus-visible` Outline für Keyboard-Navigation
- `lang="it"` auf italienischen Rezeptnamen
- `aria-live="polite"` auf Portionszahl im Stepper
- Print-CSS: alles außer Modal ausgeblendet, Modal statisch

---

## HTML-Struktur (index.html)

```
<nav>               Sticky, Blur-Hintergrund, Logo, Rezeptanzahl, Sprachwechsler
<header.hero>       H1 + Subtitle
<main>
  <section.scard>   Zutaten-Suche mit Tag-System
  <section.fg> ×7   Filter-Gruppen (je ein Chip-Set)
  <div.rbar>        "Alle Rezepte" + Count
  <div#grid>        Cards (generiert via JS)
<button.fab>        Rezept hinzufügen
<div#recipe-overlay>   Detail-Modal (slide-up)
<div#add-overlay>      Add-Modal (zentriert)
<script src="app.js">
```

---

## Bekannte Lücken / Nächste Schritte

- [ ] Mobile: Screen Wakelock damit der Bildschirm beim Kochen nicht ausgeht
- [ ] Suchindex direkt aus `recipes-processed.json` aufbauen statt hardcoded Wortlisten
- [ ] Einzelne Rezeptseiten mit URL (für Teilen / Bookmarks)
- [ ] Demo-Seiten (`demo-discover.html`, `demo-portion-scaler.html`) in `index.html` integriert
- [ ] Framework-Entscheidung steht noch aus (Next.js oder SvelteKit)

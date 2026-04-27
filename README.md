# Cucina Italiana

Eine persönliche Rezeptwebsite für 232 authentische italienische Gerichte aus *Die echte italienische Küche*. Kein Backend, keine Werbung, keine Lebensgeschichten vor dem Rezept — nur das Gericht.

Läuft direkt im Browser, kein Build-Schritt nötig.

```bash
# Lokal starten (irgendeiner dieser Befehle reicht):
node -e "require('http').createServer((q,s)=>{require('fs').readFile('.'+q.url.replace(/\/$/,'/index.html'),(e,d)=>s.end(d))}).listen(8765)"
python -m http.server 8765
# Dann: http://localhost:8765
```

---

## Was es kann

**Zutaten-Matching** — Zutaten eingeben, auf „Rezepte finden" klicken. Die Cards sortieren sich nach Übereinstimmung, jede zeigt einen Match-Score als Balken.

**7 kombinierbare Filter** — Kategorie, Schwierigkeit, Zeit, Stimmung, Anlass, Protein, eigene Rezepte. Alle gleichzeitig aktiv.

**Portionsrechner** — Im Detail-Modal: `−` / `+` skaliert alle Zutatenmengen live. Bruchzahlen, Gramm-Rundung und unterteilbare Zutaten (Eier, Knoblauchzehen) werden korrekt behandelt.

**Eigene Rezepte** — über den `+` Button unten rechts. Manuelles Formular oder Markdown-Import (drag & drop).

**Fotos** — pro Rezept hinzufüg- oder austauschbar, werden in IndexedDB gespeichert (nicht localStorage).

**3 Sprachen** — Deutsch, Englisch, Chinesisch. UI und Rezeptinhalte. Sprachwahl wird gespeichert.

---

## Dateien

### Laufzeit (werden vom Browser geladen)

| Datei | Inhalt |
|-------|--------|
| `index.html` | Einzige HTML-Seite. Enthält die komplette Seitenstruktur: Nav, Hero, Filterbereich, Rezept-Grid, zwei Overlays (Detail-Modal + Rezept-hinzufügen). |
| `style.css` | Gesamtes Styling. CSS-Variablen für Farben und Radien, kein Framework. Enthält auch Print-CSS und responsive Breakpoints. |
| `app.js` | Gesamte Logik: i18n, Filterung, Scoring, Portionsskalierung, IndexedDB für Fotos, localStorage für Ratings/Gekocht-Status/eigene Rezepte, Markdown-Parser. |
| `recipes-processed.json` | Die 232 Rezepte in maschinenlesbarem Format. Jeder Eintrag hat `keywords[]`, `protein`, `mood[]`, `occasion[]` — entweder manuell gesetzt oder beim ersten Laden automatisch erkannt. Das ist die Hauptdatenquelle. |
| `recipes-en.json` | Englische Übersetzungen der Rezeptinhalte (Name, Zutaten, Schritte). Key = deutscher Rezeptname. Fehlende Einträge fallen auf Deutsch zurück. |
| `recipes-zh.json` | Chinesische Übersetzungen, gleiche Struktur wie `recipes-en.json`. |

### Nicht mehr aktiv genutzt

| Datei | Status |
|-------|--------|
| `recipes.json` | Rohdaten aus dem Kochbuch, ursprüngliches Quellformat. Wird nicht geladen — `recipes-processed.json` ist der Stand, mit dem gearbeitet wird. Kann als Referenz bleiben oder gelöscht werden. |
| `demo-discover.html` | Früher Prototyp der Filter-/Entdeckungsseite. Funktionalität ist vollständig in `index.html` integriert. |
| `demo-portion-scaler.html` | Früher Prototyp mit einem einzelnen Rezept (Cacio e Pepe) und Portionsrechner. Ist jetzt das Modal in `index.html`. |
| `index_old_backup.html` | Ältere Version von `index.html` mit inline-minifiziertem CSS. Ersetzt durch `index.html` + `style.css`. |

---

## Technologie

Vanilla HTML/CSS/JS, keine Dependencies, kein Build-Tool. Daten in `localStorage` und `IndexedDB`, beides im Browser.

Wenn das Projekt größer wird: SvelteKit oder Next.js wären naheliegend, aber noch keine Entscheidung gefallen.

---

## Offen

- [ ] Screen Wakelock für Mobile (Bildschirm bleibt beim Kochen an)
- [ ] URL pro Rezept (für Teilen und Bookmarks)
- [ ] Die drei ungenutzten Dateien aufräumen

# Italian Recipes

Ein italienisches Rezept-Konzept mit Fokus auf sauberer UX — keine Lebensgeschichten, keine Autoplay-Ads, nur das Rezept.

## Demos

| Datei | Was es zeigt |
|-------|-------------|
| `demo-portion-scaler.html` | Einzelrezept mit automatischer Portionsumrechnung |
| `demo-discover.html` | Entdeckungsseite mit Zutaten-Matching und Filtern |
| `index.html` | Bestehendes Rezept-Layout |

## Features

### Portionsumrechnung
- `+` / `−` Stepper (1–12 Personen)
- Alle Zutatenmengen rechnen sich sofort um
- Intelligente Rundung: `0.5 TL` → `½ TL`, Gramm auf 10er gerundet
- Animierter Zahlensprung bei Änderung

### Zutaten-Matching
- Eigene Zutaten eingeben (Tag-basiert, per Enter oder Button)
- Rezepte werden nach Übereinstimmung sortiert
- Match-Score pro Rezept (z.B. „3/4 Zutaten vorhanden")
- Balkenanzeige für visuellen Vergleich

### Filter
Alle Filter kombinierbar:

| Kategorie | Optionen |
|-----------|---------|
| Stimmung | Entspannt, Besonderes, Comfort Food, Schnell, Leicht |
| Anlass | Familie, Romantisch, Freunde, Unter der Woche, Sonntag |
| Gericht | Pasta, Antipasti, Pizza, Hauptgericht, Suppe, Dolci |
| Protein | Fisch, Meeresfrüchte, Rind, Schwein, Geflügel, Vegetarisch |

### Design
- Apple-Systemfont (`-apple-system, BlinkMacSystemFont`)
- Sticky Nav mit Blur-Effekt
- Runde Karten, großzügige Abstände
- Farbkodierte Filter-Chips pro Kategorie
- Smooth Animationen durchgehend

## Nächste Schritte

- [ ] Rezeptdaten aus `recipes.json` in die Discovery-Seite laden
- [ ] Einzelrezept-Seite mit Portion Scaler verbinden
- [ ] Suchindex aus echten Zutaten aufbauen
- [ ] Mobile-Optimierung (Screen-Wakelock, Kochansicht)
- [ ] Backend / Datenbankanbindung

## Technologie

Aktuell: Vanilla HTML/CSS/JS, keine Dependencies.  
Geplant: Framework-Entscheidung steht noch aus (Next.js oder SvelteKit wahrscheinlich).

## Hintergrund

Inspiration aus Nutzer-Frustrationspunkten bei bestehenden Rezeptseiten:
- Endlose Lebensgeschichten vor dem Rezept (SEO-getrieben)
- Aggressive Werbung auf Mobile
- Keine Zutaten-basierte Suche
- Kaputte Mobile-UX (Screen-Timeout, Scroll-Reset durch Ads)
- Feste Portionsmengen ohne Umrechnung

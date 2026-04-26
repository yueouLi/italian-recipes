# Cucina Italiana — Gesprächsverlauf

Datum: 2026-04-26  
Projekt: Italienische Rezept-Website

---

## Was wir gebaut haben

Ausgangspunkt war ein gescanntes italienisches Kochbuch als PDF. Am Ende steht eine vollständige, statische Single-File Web-App mit 232 Rezepten.

---

## Session 1 — Setup & PDF-Extraktion

**Ziel:** MarkItDown installieren und das Kochbuch als Text importieren.

- MarkItDown installiert über Anaconda (`C:\ProgramData\anaconda3\python.exe -m pip install`)
- Problem: Das PDF ist gescannt (kein Textlayer) → MarkItDown liefert leere Ausgabe
- Versuche: Azure Document Intelligence (Netzwerk geblockt), Tesseract (nicht im PATH)
- Lösung: **EasyOCR + pypdfium2** — läuft lokal, keine Cloud-Abhängigkeit
- Fix: `KMP_DUPLICATE_LIB_OK=TRUE` für OpenMP-Konflikt mit EasyOCR
- Ergebnis: `recipes.json` mit 232 Rezepten, 410 KB

---

## Session 2 — Erste UI

Datei: `C:\tmp\recipe-demo.html`

Apple-Style Einzelrezept mit:
- Hero-Bild (Unsplash)
- Portions-Scaler (+/− Stepper, 1–12 Personen)
- Zutatenliste mit automatischer Mengenumrechnung
- Zubereitungsschritte nummeriert
- Profi-Tipp-Karte
- Animierter Zahlensprung bei Änderung

Discovery-Seite: `C:\tmp\recipe-discover.html`
- Zutaten-Matching (eigene Zutaten als Tags eingeben)
- Match-Score + Balkenanzeige pro Rezept
- Filter-Chips: Stimmung, Anlass, Gericht, Protein

---

## Session 3 — Vollständige App mit echten Daten

Build-Skript: `C:\tmp\build_site.py`  
Output: `C:\Users\wfxndvg\OneDrive - Allianz\Dokumente\Claude\cucina-italiana\index.html`

### Was integriert wurde

**Daten**
- `recipes.json` als eingebettetes JS-Array — keine Backend-Abhängigkeit
- Alle 232 Rezepte mit Name, italiano-Name, Kategorie, Zutaten, Schritten, Tipps

**Filter-System**
- Kategorie: Pasta, Antipasti, Pizza, Hauptgericht, Suppe, Dolci
- Schwierigkeit: Einfach, Mittel, Schwer
- Zeit: unter 30 Min, 30–60 Min, über 60 Min
- Stimmung: Entspannt, Besonderes, Comfort Food, Schnell, Leicht
- Anlass: Familie, Romantisch, Freunde, Unter der Woche, Sonntag
- Protein: Fisch, Meeresfrüchte, Rind, Schwein, Geflügel, Vegetarisch

**Protein-Erkennung** (Name → erste 3 Zutaten → alle Zutaten)
- `WILD_KW` hat Priorität über `SCHWEIN_KW` — verhindert, dass Speck/Salami-Garnierung das Gericht als "Schwein" klassifiziert
- Fix für "Coniglio in porchetta": Name enthält "Kaninchen" → wild
- Fix für "Geflügelragout": Name enthält "Geflügel" → geflügel (nicht Meeresfrüchte wegen 4 Garnelen)

**Rezept hinzufügen**
- Formular-Dialog mit allen Feldern
- Markdown-Upload: automatische Parsing von `## Zutaten` und `## Zubereitung`
- Neue Rezepte landen in localStorage, werden sofort in alle Filter integriert

**Foto pro Rezept**
- Upload-Button im Modal
- Canvas-Komprimierung: 800×500px, JPEG 75%
- Speicherung als Base64 in localStorage
- Anzeige als Hero im Modal + kleines Thumbnail in der Karte

**"Schon gekocht" + Bewertung**
- Toggle-Button im Modal (grün wenn aktiv)
- 1–5 Sterne
- Beides sichtbar in der Karte (Badge + Sterne-Icons)
- Alles in localStorage, überlebt Browser-Reload

**Portions-Scaler**
- Basis aus `recipes.json` (`servings`-Feld)
- +/− Stepper im Modal
- `scaleIng()` skaliert Zutatenliste
- `scaleStepText()` skaliert Mengenangaben in Zubereitungstext (neu, Session 4)

---

## Session 4 — Step Text Scaling

**Problem:** "500g Mehl auf die Arbeitsfläche" ändert sich nicht wenn man von 4 auf 8 Portionen geht.

**Lösung:**

Drei JS-Funktionen in `build_site.py`:

```javascript
scaleNum(val, p, b)       // Einheitliches Runden: ≥100 → 10er, ≥10 → 1er, sonst ¼-Schritte
scaleIng(ing, p, b)       // Zutatenliste — skaliert erste Zahl (auch Brüche wie 1/2)
scaleStepText(text, p, b) // Fließtext — regex erkennt "200g", "3 EL", "1/2 TL" etc.
```

`scaleStepText` unterscheidet:
- **Skalierbare Einheiten:** g, kg, ml, l, cl, dl, EL, TL, Prise, Stück, Becher, Bund, Scheibe, Tasse, Liter
- **Nicht skalieren:** °C, Grad, Min, Std, Stunden, cm, mm

Step-Rendering von `${s}` geändert zu `${scaleStepText(s, portions, base)}`.

---

## Technische Entscheidungen

| Entscheidung | Begründung |
|---|---|
| Single-File HTML | Keine Server-Abhängigkeit, direkt als `file://` öffnen |
| localStorage | Kein Backend nötig, Daten bleiben im Browser |
| Python Build-Skript | JSON zu groß für direktes Editieren, Script generiert neu |
| Anaconda Python | Corporate-Netzwerk blockt winget, chocolatey, GitHub direkt |
| EasyOCR statt Azure | Netzwerk-Blocking, lokal zuverlässiger für das spezifische PDF |

---

## Dateien

| Datei | Was |
|---|---|
| `C:\tmp\build_site.py` | Build-Script (Quelle) |
| `C:\tmp\fix_scale.py` | Einmalig genutztes Patch-Script |
| `C:\Users\wfxndvg\OneDrive - Allianz\Dokumente\Claude\cucina-italiana\index.html` | Generierter Output (~435 KB) |
| `C:\Users\wfxndvg\OneDrive - Allianz\Dokumente\Claude\cucina-italiana\recipes.json` | Quelldaten (232 Rezepte, 410 KB) |
| `C:\tmp\recipe-demo.html` | Früher Prototyp (Einzelrezept) |
| `C:\tmp\recipe-discover.html` | Früher Prototyp (Discovery) |

---

## Offene Punkte (README)

- [ ] Mobile-Optimierung: Screen-Wakelock für Kochansicht
- [ ] Suchfeld (Freitext über Name + Zutaten)
- [ ] Export / Backup der localStorage-Daten
- [ ] Framework-Entscheidung wenn das Projekt wächst (Next.js oder SvelteKit)

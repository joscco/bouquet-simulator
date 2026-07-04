# Bouquet Studio

Angular-/Pixi-Anwendung zum Entwerfen prozeduraler Blumen und virtueller
Blumensträuße. Die Oberfläche verwendet Tailwind CSS.

## Entwicklung

```bash
npm install
npm start
```

- Strauß-Editor: `http://localhost:4200/`
- Blumen-Editor: `http://localhost:4200/editor`

## Blumenmodell

Eine Blume ist ein gerichteter Knotengraph:

- Kanten werden als Stängel gerendert.
- Verbindungen können Ketten oder Verzweigungen mit Wertebereichen erzeugen.
- Knoten tragen optional eine gezeichnete oder importierte Grafik.
- Freigegebene Knoten lassen sich später individuell im Strauß verschieben.
- Seed und Definition erzeugen deterministisch dieselbe Struktur.

Der Blumen-Editor speichert seine Graphpositionen zusammen mit der Definition.
Blumen und vollständige Straußprojekte können als JSON importiert und exportiert
werden. Das aktuelle Datenformat verwendet `schemaVersion: 2`.

## Befehle

```bash
npm test
npm run build
```

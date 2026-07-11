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
- Jeder Knoten besitzt höchstens eine Eingangsverbindung und beliebig viele Ausgänge.
- Anzahl, Länge, Winkel, Zufall und Stängelstil der Eingangsverbindung liegen am Zielknoten.
- Verbindungen können Ketten oder Verzweigungen mit Wertebereichen erzeugen.
- Knoten tragen optional eine gezeichnete oder importierte Grafik.
- Grafiken besitzen neben ihren Abmessungen eine Skalierung und einen lokalen XYZ-Offset.
- Im Strauß wird die vollständige Blume an ihrem Einsteckpunkt verschoben und geneigt.
- Seed und Definition erzeugen deterministisch dieselbe Struktur.

Der Blumen-Editor speichert seine Graphpositionen zusammen mit der Definition.
Blumen und vollständige Straußprojekte können als JSON importiert und exportiert
werden. Das aktuelle Datenformat verwendet `schemaVersion: 2`.

### Eingebaute 3D-Modelle

Die Blattkonturen und ihre triangulierten 3D-Geometrien stehen in
`src/app/core/rendering/graphic-geometries.ts`. Neue prozedurale Grundformen
werden dort in `BUILT_IN_GRAPHICS` registriert und in `createBuiltInGeometry`
erzeugt. Bemalungen werden als UV-Pinselstriche in der Blumendefinition
gespeichert; sie bleiben dadurch im JSON editierbar und skalieren mit dem Modell.

## Befehle

```bash
npm test
npm run build
```

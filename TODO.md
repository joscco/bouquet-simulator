# Roadmap

Diese Roadmap enthält nur offene Arbeit. Die Reihenfolge richtet sich nach
Dringlichkeit und fachlichen Abhängigkeiten.

## 1. Grafische Ausdrucksmöglichkeiten erweitern

- [ ] **GRAPHICS-01: Weitere 3D-Grundelemente ergänzen**
  - Benötigte Formen anhand konkreter Blumenkomponenten priorisieren.
  - Geometrie, Parameter, JSON-Validierung und Vorschaudarstellung gemeinsam ergänzen.
  - Dornen!!
  - Abnahme: Jedes neue Element besitzt einen konkreten Anwendungsfall und ist vollständig serialisierbar.

- [ ] **GRAPHICS-02: Muster- und Mal-Konzept neu entwerfen**
  - Anwendungsfälle festlegen: Farbverläufe, Blattadern, Flecken, Kanten oder freie Bemalung.
  - Zwischen parametrischen Mustern, Texturen und freiem Malen bewusst entscheiden.
  - Bedienung erst implementieren, wenn Mehrfarben-, Löschen-, Rückgängig- und Vorschaufunktionen geklärt sind.
  - Abnahme: Das Ergebnis ist präzise editierbar, im JSON reproduzierbar und in der 3D-Ansicht performant.

- [ ] Mehr Blumen vorbereiten

## 2. Dokumentation und Präsentation

- [ ] **DOCS-01: README auf Englisch überarbeiten**
  - Projektziel, lokale Entwicklung, Tests, Build und GitHub-Pages-Deployment dokumentieren.
  - Den Unterschied zwischen browserlokalem Speichern und dem lokalen Defaults-Server erklären.
  - Abnahme: Ein neuer Entwickler kann das Projekt ohne zusätzliche mündliche Hinweise starten und bearbeiten.

- [ ] **BRAND-01: Website-Icon erstellen und einbinden**
  - App-Icon und Favicon in den benötigten Größen bereitstellen.
  - Darstellung auf hellem und dunklem Browserhintergrund prüfen.

- [ ] **MEDIA-01: Drehendes Straußvideo erstellen**
  - Repräsentativen Strauß, Kamerawinkel, Hintergrund, Dauer und Ausgabeformat festlegen.
  - Deterministische Turntable-Drehung rendern und für Website beziehungsweise Präsentation exportieren.
  - Abhängigkeit: Nach den gewünschten Grafikergänzungen umsetzen.

## Vorgeschlagener nächster Block

1. `GRAPHICS-01` anhand konkreter Blumen priorisieren; Dornen sind der erste benannte Anwendungsfall.
2. Danach das Muster- und Mal-Konzept fachlich klären.
3. Anschließend Dokumentation und Präsentationsaufgaben vervollständigen.

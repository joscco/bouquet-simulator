# Roadmap

Die Reihenfolge richtet sich nach Abhängigkeiten: Zuerst wird der Editor verlässlich
und konsistent, danach werden Modellgrenzen und Straußinteraktionen erweitert. Neue
Grafikfunktionen und Veröffentlichung bauen auf diesem stabilen Stand auf.

## 1. Flower-Editor stabilisieren

- [ ] **EDITOR-01: Verdeckte Eingabefelder beheben**
  - Alle Eigenschaften-Panels bei den unterstützten Desktop- und Mobile-Breiten prüfen.
  - Lange Bezeichnungen, Zahlenfelder, Einheiten und Farbfelder dürfen sich nicht überlagern oder abgeschnitten werden.
  - Abnahme: Jeder Wert ist sichtbar, per Tastatur erreichbar und ohne horizontales Scrollen editierbar.
  - [x] Header-Überlagerung, horizontales Abschneiden und schmale Slider-Container technisch abgesichert.
  - [ ] Abschließende Sichtprüfung über die unterstützten Viewportbreiten durchführen.

## 3. Straußinteraktion verbessern

- [ ] **BOUQUET-01: Blumen EINZELN im Strauß drehen**
  - Drehung als Instanzeigenschaft modellieren und im JSON speichern.
  - Ergonomische Steuerung für die relevanten Rotationsachsen ergänzen.
  - Abnahme: Drehung bleibt nach Export, Import und Neuladen erhalten und verändert keine Blumendefinition.

- [ ] **BOUQUET-02: Starkes Ineinanderliegen von Blumen reduzieren**
  - Zunächst die gewünschte Strategie festlegen: Warnung, automatische Entflechtung oder manuelle Korrekturhilfen.
  - Für die Prüfung vereinfachte räumliche Hüllen verwenden; keine teure Dreiecks-Kollision pro Frame.
  - Abnahme: Neue beziehungsweise verschobene Blumen können ohne deutliche Hauptblüten-Überschneidungen angeordnet werden.
  - Abhängigkeit: Baut auf der Instanzrotation aus `BOUQUET-01` auf.

## 4. Grafische Ausdrucksmöglichkeiten erweitern

- [ ] **GRAPHICS-01: Weitere 3D-Grundelemente ergänzen**
  - Benötigte Formen anhand konkreter Blumenkomponenten priorisieren.
  - Geometrie, Parameter, JSON-Validierung und Vorschaudarstellung gemeinsam ergänzen.
  - Abnahme: Jedes neue Element besitzt einen konkreten Anwendungsfall und ist vollständig serialisierbar.

- [ ] **GRAPHICS-02: Muster- und Mal-Konzept neu entwerfen**
  - Anwendungsfälle festlegen: Farbverläufe, Blattadern, Flecken, Kanten oder freie Bemalung.
  - Zwischen parametrischen Mustern, Texturen und freiem Malen bewusst entscheiden.
  - Bedienung erst implementieren, wenn Mehrfarben-, Löschen-, Rückgängig- und Vorschaufunktionen geklärt sind.
  - Abnahme: Das Ergebnis ist präzise editierbar, im JSON reproduzierbar und in der 3D-Ansicht performant.

## 5. Präsentation und Veröffentlichung

- [ ] **BRAND-01: Website-Icon erstellen und einbinden**
  - App-Icon und Favicon in den benötigten Größen bereitstellen.
  - Darstellung auf hellem und dunklem Browserhintergrund prüfen.

- [ ] **MEDIA-01: Drehendes Straußvideo erstellen**
  - Repräsentativen Strauß, Kamerawinkel, Hintergrund, Dauer und Ausgabeformat festlegen.
  - Deterministische Turntable-Drehung rendern und für Website beziehungsweise Präsentation exportieren.
  - Abhängigkeit: Nach `BOUQUET-01`, `BOUQUET-02` und den gewünschten Grafikergänzungen umsetzen.

- [ ] **DEPLOY-01: GitHub-Pages-Deployment einrichten**
  - Angular-Build für den Repository-Basispfad konfigurieren.
  - Clientseitiges Routing und direkten Aufruf von `/editor` berücksichtigen.
  - Automatischen Build und Deploy über GitHub Actions einrichten.
  - Abnahme: Hauptansicht und Editor funktionieren nach einem frischen Deployment sowie nach einem Browser-Reload.
  - Abhängigkeit: `BRAND-01` vor dem öffentlichen Release abschließen.
  - [x] Dynamischen Basispfad, Routing-Fallback und GitHub-Actions-Workflow eingerichtet.
  - [ ] Pages als Veröffentlichungsquelle im späteren GitHub-Repository aktivieren und Live-URL prüfen.

## Vorgeschlagener nächster Block

1. `EDITOR-01` mit allen Knoten-, Komponenten- und Schleifen-Panels abschließend visuell prüfen.
2. Danach `BOUQUET-02` konzipieren und die gewünschte Entflechtungsstrategie festlegen.
3. Anschließend die benötigten neuen Grundelemente für `GRAPHICS-01` priorisieren.


Weitere:

Toasts unten gehen nicht weg -> Nervig
Verbindungen von Nodes teilweise unschön
Readme verbessern -> Englisch!

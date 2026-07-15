# Roadmap

Diese Roadmap enthält nur noch offene Arbeit. Die Reihenfolge richtet sich nach
Dringlichkeit und Abhängigkeiten: Zuerst werden Persistenz und Zuverlässigkeit des
Editors geklärt, danach Graph- und Straußinteraktionen. Neue Grafikfunktionen und
Präsentationsaufgaben bauen auf diesem Stand auf.

## 1. Flower-Editor stabilisieren

- [x] **EDITOR-01: Verdeckte Eingabefelder beheben**
  - Alle Eigenschaften-Panels bei den unterstützten Desktop- und Mobile-Breiten prüfen.
  - Lange Bezeichnungen, Zahlenfelder, Einheiten und Farbfelder dürfen sich nicht überlagern oder abgeschnitten werden.
  - Abnahme: Jeder Wert ist sichtbar, per Tastatur erreichbar und ohne horizontales Scrollen editierbar.
  - Bereits technisch abgesichert: Header-Überlagerung, horizontales Abschneiden und schmale Slider-Container.
  - Abgeschlossen: Sichtprüfung aller Knoten-, Komponenten- und Schleifen-Panels bei 320, 390, 1024 und 1440 px.

- [x] **EDITOR-02: Benachrichtigungen kontrollierbar machen**
  - Erfolgs- und Informations-Toasts nach kurzer Zeit automatisch schließen.
  - Fehler länger anzeigen und weiterhin manuell schließbar machen.
  - Wiederholte identische Meldungen nicht unbegrenzt stapeln.
  - Abnahme: Keine Meldung verdeckt dauerhaft den Editor oder bleibt ohne erkennbaren Grund stehen.

- [x] **EDITOR-03: Speichern auf statischen Deployments klären**
  - Browserlokales Speichern von Blumen- und Komponentendefinitionen einführen.
  - „Speichern“ und das entwicklerspezifische „In Defaults übernehmen“ als getrennte Aktionen behandeln.
  - Den lokalen `/api/defaults`-Schreibweg nur in der Entwicklungsumgebung anbieten.
  - Import und Export als portablen Sicherungs- und Übertragungsweg beibehalten.
  - Abnahme: Auf GitHub Pages geht keine Bearbeitung beim Neuladen verloren und es wird kein nicht vorhandener API-Endpunkt aufgerufen.

## 2. Knotengraph verbessern

- [ ] **GRAPH-01: Verbindungen optisch sauber führen**
  - Problemfälle mit mehreren Ein- und Ausgängen, Schleifen und Komponentenreferenzen sammeln.
  - Kurven so führen, dass sie nicht unnötig durch Knoten, Ports oder Beschriftungen laufen.
  - Abstände und Kurvenradien für kurze sowie lange Verbindungen vereinheitlichen.
  - Abnahme: Zusammengehörige Ports und Verbindungen bleiben auch in dichten Graphen eindeutig lesbar.

## 3. Straußinteraktion verbessern

- [ ] **BOUQUET-01: Blumen einzeln im Strauß drehen**
  - Drehung als Instanzeigenschaft modellieren und im JSON speichern.
  - Eine ergonomische Steuerung für die relevanten Rotationsachsen ergänzen.
  - Abnahme: Jede Blume ist unabhängig drehbar; die Drehung bleibt nach Export, Import und Neuladen erhalten und verändert keine Blumendefinition.

- [ ] **BOUQUET-02: Starkes Ineinanderliegen von Blumen reduzieren**
  - Zunächst die gewünschte Strategie festlegen: Warnung, automatische Entflechtung oder manuelle Korrekturhilfen.
  - Für die Prüfung vereinfachte räumliche Hüllen verwenden; keine teure Dreiecks-Kollision pro Frame.
  - Abnahme: Neue beziehungsweise verschobene Blumen können ohne deutliche Hauptblüten-Überschneidungen angeordnet werden.
  - Abhängigkeit: Baut auf der Instanzrotation aus `BOUQUET-01` auf.

- [ ] **BOUQUET-03: Blumenauswahl mit echten Vorschaubildern darstellen**
  - Generische Icons aus der Blumenauswahl entfernen.
  - Für jede Definition einen reproduzierbaren Snapshot der tatsächlichen 3D-Generierung erzeugen.
  - Snapshots cachen und nur bei geänderter Definition neu erzeugen.
  - Abnahme: Die Auswahl zeigt die konkrete Blume schnell und ohne sichtbares Nachrendern statt eines abstrakten Icons.

## 4. Grafische Ausdrucksmöglichkeiten erweitern

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

## 5. Dokumentation und Präsentation

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
  - Abhängigkeit: Nach `BOUQUET-01`, `BOUQUET-02` und den gewünschten Grafikergänzungen umsetzen.

## Vorgeschlagener nächster Block

1. `EDITOR-03` umsetzen, damit Speichern auf GitHub Pages eindeutig und dauerhaft funktioniert.
2. `EDITOR-01` vollständig visuell prüfen und `EDITOR-02` direkt mit bereinigen.
3. `BOUQUET-01` für echte unabhängige Instanzrotation vervollständigen.
4. Danach `BOUQUET-02` konzipieren und parallel die Problemfälle für `GRAPH-01` sammeln.

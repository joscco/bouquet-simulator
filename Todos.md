# Offene Punkte

## Formen

- [ ] Kakteen vollständig abbilden: Gerippte, längliche Körper sind über die Kugelform bereits möglich. Eine gezielte Modellierung von Areolen und Stacheln sowie ein guter Editor-Workflow dafür sind noch offen.

# Erledigt

## Streuung und Verbindungen

- [x] Abweichung von der Hauptrichtung auf 0 bis 180 Grad begrenzen.
- [x] Längenintervalle bei gleichmäßiger Streuung entkoppeln, damit kurze und lange Auswüchse keine „Schnecke“ bilden.
- [x] Eingangsparameter des Startknotens einer Schleife beim Erzeugen der Wiederholungen berücksichtigen.
- [x] Aktion „Eingangsverbindung lösen“ direkt neben dem Löschen-Button des Knotens anzeigen.

## Stängel, Biegung und Drehung

- [x] Biegungen außerhalb von ±100 % mit veränderlichem Radius als Spirale statt als überlagerte Kreisbahn darstellen.
- [x] Stängelfarbe, Dicken, Biegung, Krümmung und Biegungsrichtung vollständig in jeder Eingangsverbindung speichern; globale Werte nur noch zur Migration alter Definitionen verwenden.
- [x] Biegungs- und Drehungsparameter kompakt organisieren; Ansatz-/Spitzenverläufe nur optional einblenden.
- [x] Eigendrehung der 3D-Form in den Abschnitt „Biegung & Drehung“ verschieben.
- [x] Stängeldicken von 0 und Dezimalwerte zulassen.

## 3D-Formen

- [x] Stäbchen und Kegel aus der Formauswahl entfernen; bestehende Definitionen weiterhin kompatibel als Kugelform laden.
- [x] Formauswahl auf Kugel und Blatt reduzieren.
- [x] Blatt um Fransentiefe, Randsegmente, Fransenschärfe, Ausbuchtung und Blattdrehung erweitern.
- [x] Separate Skalierung der 3D-Form entfernen; Breite, Höhe und Tiefe bestimmen die Größe.
- [x] Kugelform um radiale Rippen als Grundlage für Kakteen erweitern.

## Bedienung

- [x] Sämtliche eigenen Komponenten-CSS-Dateien entfernen und Layout sowie Zustände ausschließlich mit Tailwind-Klassen abbilden.
- [x] Strauß- und Komponenten-Editor angleichen: Preview als durchgehende Bühne und animiertes Halbseiten-Panel für die Einstellungen; im Komponenteneditor inklusive ausklappbarem Node-Tree.
- [x] Globale Kopfzeile auf Sprachwahl oben links und textbasierten Ansichtstoggle oben rechts reduzieren.
- [x] Kopfzeile beim Öffnen der Settings unverändert über die gesamte Bildschirmbreite stehen lassen.
- [x] Settings als Schublade mit einem abgerundeten, mitwandernden Griff und drehendem Richtungspfeil bedienen.
- [x] Strauß- und Komponenten-Einstellungen auf dieselbe projizierbare Settings-Schubladen-Komponente umstellen.
- [x] Preview-Menü unter dem Ansichtstoggle auf Zentrieren und Neuberechnen reduzieren; 3D-Export in die Einstellungen verschieben.
- [x] Dieselbe Preview-Werkzeugleiste mit Zentrieren und Neuberechnen in Strauß- und Komponentenansicht verwenden.
- [x] Suchdialog vor Settings und Preview anzeigen, ohne die globale Kopfzeile zu verdecken.
- [x] Referenzierte Komponentenknoten direkt mit ihrer Quelldefinition verlinken.
- [x] Vor einem Definitionswechsel ungespeicherte Änderungen mit Speichern, Verwerfen oder Abbrechen abfangen.
- [x] Die letzten Bearbeitungsschritte inklusive Parameter-, Struktur- und Positionsänderungen rückgängig machen.
- [x] Rippenparameter und Musterauswahl mit lesbaren, formspezifischen Miniaturen darstellen.
- [x] Zahlenfelder durch Dezimalschritte, Ziehen im Feld, Auswahl bei Fokus und Tastatursteuerung nutzerfreundlicher machen.
- [x] Katalogsuche als eigenen Suchdialog mit Auswahl-Button umsetzen.
- [x] Zuletzt bearbeitete Blume als Query-Parameter in der URL merken und beim Öffnen wiederherstellen.
- [x] Blumenname unabhängig vom eingeklappten Definitions-/Ausgänge-Menü anzeigen.
- [x] Mehrfachselektion auf alle markierten Knoten anwenden und nur gemeinsam verfügbare Parametergruppen anzeigen.

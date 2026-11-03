# Markdown: vom Gespräch zum Diagramm und zurück

Process Studio v0.11 · 28. Oktober 2026 · Ergänzung zum Benutzerhandbuch

1. Bitten Sie Ihren Chat-Assistenten, das Gespräch als `.md` zu speichern. Trennen Sie aktuelle Abläufe, Vorschläge und offene Fragen deutlich.
2. Wählen Sie **Markdown-Datei öffnen**, prüfen Sie die Vorschau und wählen Sie **Als Beschreibung verwenden**. Der Eingabetext wird ersetzt; das aktuelle Diagramm bleibt erhalten.
3. Prüfen Sie den Text und erstellen Sie das Diagramm. Erst diese Aktion sendet die Beschreibung an das KI-Modell und nutzt den Modelldienst.
4. Prüfen Sie das Diagramm. Wählen Sie einen Schritt, prüfen Sie seine Quelle und korrigieren Sie Geschäftsbereich oder Systemkarte. Beantworten Sie Rückfragen. Für Änderungen an Aktivitäten oder Verbindungen beschreiben Sie die Änderung und wenden sie an; dadurch entsteht ein vorgeschlagener Sollprozess, to-be. Die Leserichtung kann horizontal oder vertikal sein. Das Verschieben von Schritten per Drag-and-drop wird derzeit nicht unterstützt.
5. Wählen Sie **Markdown exportieren** in der Kopfzeile. Auch in der Kundenübersicht enthält die Datei den vollständigen Detailprozess: Mermaid-Diagramm, Schritte, Rollen, Systeme, Bereiche, Verbindungen, Belege, offene Fragen und Quelle. Noch nicht angewendete Quelltextänderungen, Befehle und Antworten bleiben separat gekennzeichnet.
6. Hängen Sie die heruntergeladene `.md` an Ihren Chat an und setzen Sie die Analyse fort. Die Datei enthält einen Vorschlag für die Fortsetzung. Die Diagrammanzeige hängt von der Mermaid-Unterstützung des Chats ab.
7. Öffnen Sie die Datei wieder auf der Website. Eine unveränderte Process-Studio-Datei bietet **Gespeicherten Prozess wiederherstellen** ohne KI-Aufruf. Eine neue ungeprüfte Version entsteht; das vorherige Diagramm bleibt im lokalen Verlauf. Richtung und ausstehende Texte werden wiederhergestellt; die gewählte Oberflächensprache bleibt erhalten.
8. Nach Änderungen am lesbaren Text oder Diagramm im Chat wählen Sie **Als Beschreibung verwenden** und erstellen einen neuen Entwurf. Die Wiederherstellung des alten Snapshots ist dann deaktiviert, damit Änderungen nicht übergangen werden.

## Grenzen und Speicherung

- UTF-8-Dateien `.md` oder `.markdown` bis 2.000.000 Bytes. Beschreibungen zur Analyse sind auf 120.000 Zeichen begrenzt; wählen Sie bei längeren Gesprächen einen kleineren Prozessbereich.
- Markdown ist eine lesbare Übergabe und ein Prozess-Snapshot, keine Sicherung des gesamten Versionsverlaufs. Laden Sie vor weiteren Änderungen eine Kopie herunter. Das Anhängen im Chat erfolgt durch Sie.
- Öffnen, Wiederherstellen und Exportieren lösen keine KI-Aufrufe aus. Erstellung, KI-Klärung und Änderungen nutzen den vorhandenen Modelldienst.
- Prüfen Sie Quellen und Notizen vor dem Teilen: Die Datei enthält die gesamten eingegebenen Prozessinformationen. Geschäftliche Fakten müssen fachlich bestätigt werden.
- Texteingabe sowie JSON-, SVG- und Mermaid-Exporte bleiben verfügbar. Diese Ergänzung aktualisiert nicht die älteren PDF-Handbücher v0.7.

# Wortwechsel

Privater, statischer Vokabeltrainer. Einstieg: `dist/index.html`.

- 95 Spanisch–Deutsch-Paare aus „La ropa · Unidad 4“ enthalten.
- Import aus Zwischenablage, TXT, CSV, TSV und JSON; komplette kopierte Quizlet-Seiten werden auf Begriffspaare reduziert. Vor dem Speichern gibt es eine bearbeitbare Vorschau.
- Adaptiver Modus: pro Richtung einmal Multiple Choice, danach zweimal richtig schreiben. Fehler werden mit Abstand in derselben Runde wiederholt. Andere Richtungen werden über spätere Runden mit höherer Wahrscheinlichkeit bei schwächerem Fortschritt gewählt.
- Wahlweise ausschließlich Multiple Choice oder Schreibfragen, feste oder gemischte Richtung, Runden mit 5/10/20/allen Begriffen, optionale Akzent- und Artikelprüfung.
- Freie Karteikarten, Suche, Lernset-Bearbeitung, Text-Export und JSON-Sicherung mit Fortschritt. JSON-Sicherungen werden als zusätzliche Lernsets importiert, vorhandene Sets bleiben bestehen.
- Sets und Fortschritt liegen nur in Local Storage dieses Browserprofils und dieser Domain. Keine geräteübergreifende Synchronisierung. Sicherung exportieren, bevor Browserdaten gelöscht werden.
- Keine Laufzeit-Abhängigkeiten. Optionale Webfonts mit System-Fallback.

Tests: `npm test`. Die Tests umfassen Parser, Antwortvarianten, adaptive Lernschritte, zufällige Richtungen und Anwendungsabläufe in einer DOM-Simulation. Ein tatsächlicher Browser- und Layouttest erfordert eine verfügbare Browserverbindung.

Die Hosting-Konfiguration steht in `.openai/hosting.json`. Die private Veröffentlichung wird über die Sites-Skill verwaltet.

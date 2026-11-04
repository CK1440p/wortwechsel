# Wortwechsel

Privater, statischer Vokabeltrainer. Einstieg: `dist/index.html`.

- 95 Spanisch–Deutsch-Paare aus „La ropa · Unidad 4“ enthalten.
- Import aus Zwischenablage, TXT, CSV, TSV und JSON; komplette kopierte Quizlet-Seiten werden auf Begriffspaare reduziert. Vor dem Speichern gibt es eine bearbeitbare Vorschau.
- Adaptiver Modus: pro Richtung einmal Multiple Choice, danach zweimal richtig schreiben. Fehler werden mit Abstand in derselben Runde wiederholt. Andere Richtungen werden über spätere Runden mit höherer Wahrscheinlichkeit bei schwächerem Fortschritt gewählt.
- Wahlweise ausschließlich Multiple Choice oder Schreibfragen, feste oder gemischte Richtung, Runden mit 5/10/20/allen Begriffen, optionale Akzent- und Artikelprüfung.
- Freie Karteikarten, Suche, Lernset-Bearbeitung, Text-Export und JSON-Sicherung mit Fortschritt. JSON-Sicherungen werden als zusätzliche Lernsets importiert, vorhandene Sets bleiben bestehen.
- Dialoge: 2 eingebaute Dialoge („En la tienda“ per usted und per tú) und eigene Dialoge im Format `Sprecher: Spanisch | Deutsch`. Lesen und Anhören, dann 4 Stufen: Lücken, viele Lücken mit Anfangsbuchstaben, ganze Sätze aus dem Kopf, Testangabe mit Selbstkontrolle. Stufe gilt ab 80 % beim ersten Versuch. Fortschritt liegt unter `dialogs` im selben Local-Storage-Eintrag und in der JSON-Sicherung.
- Dialog-Abschnitte: Jeder Dialog lässt sich in Teilen von etwa 5 Zeilen üben, jeder Teil hat einen eigenen Stufen-Stand. Dialoge lassen sich direkt aus einem KI-Chat einfügen, mit Vorschau vor dem Speichern.
- Grammatik: Die Tabelle „Los pronombres demostrativos“ mit 4 Stufen: 4 Lücken, 8 Lücken, ganze Tabelle aus dem Kopf, Formen in Sätzen einsetzen (72 Sätze, jede Runde zieht pro Form zufällig einen). Stufe gilt ab 80 % beim ersten Versuch. Fehler werden mit Lösung gezeigt und danach selbst geschrieben. Fortschritt liegt unter `grammar`. Neue Tabellen kommen als Eintrag in `WWGrammarSeed` in `dist/seed.js`.
- Sets und Fortschritt liegen nur in Local Storage dieses Browserprofils und dieser Domain. Keine geräteübergreifende Synchronisierung. Sicherung exportieren, bevor Browserdaten gelöscht werden.
- Keine Laufzeit-Abhängigkeiten. Optionale Webfonts mit System-Fallback.

- Konto: Anmeldung per Link aus der E-Mail über Supabase. Der Stand aus Local Storage wird in `public.user_data` gespiegelt und zwischen Geräten zusammengeführt. Ohne Anmeldung läuft alles wie zuvor nur lokal. Live: https://ck1440p.github.io/wortwechsel/

Tests: `npm test`. Die Tests umfassen Parser, Antwortvarianten, adaptive Lernschritte, zufällige Richtungen und Anwendungsabläufe in einer DOM-Simulation. Ein tatsächlicher Browser- und Layouttest erfordert eine verfügbare Browserverbindung.

Die Hosting-Konfiguration steht in `.openai/hosting.json`. Die private Veröffentlichung wird über die Sites-Skill verwaltet.

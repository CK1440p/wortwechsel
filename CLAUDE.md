# Wortwechsel – Hinweise für Claude-Sessions

Das gemeinsame Projektwissen (Stand, offene Aufgaben, Session-Logs, Entscheidungen, Fallstricke) liegt in einem **Obsidian-Vault in iCloud Drive**, nicht im Repo:

| Gerät | Pfad |
|---|---|
| Mac | `~/Library/Mobile Documents/com~apple~CloudDocs/Obsidian/Wortwechsel/` |
| Windows | `%USERPROFILE%\iCloudDrive\Obsidian\Wortwechsel\` |

**Vor der Arbeit:** `git pull --ff-only`, dann im Vault `Start hier.md` und `Für Claude-Sessions.md` lesen, danach `Stand.md`, `Offene Aufgaben.md`, `Eingang/` und die neuesten Notizen in `Log/`.

**Nach der Arbeit:** Log-Notiz in `Log/` anlegen (Vorlage `Vorlagen/Vorlage Session-Log.md`), `Stand.md` überschreiben, `Offene Aufgaben.md` pflegen.

Kurzregeln (Details im Vault):
- Git-Identität: `CK1440p` / `267741933+CK1440p@users.noreply.github.com` (Repo ist öffentlich).
- `npm test` muss grün sein; UI-Änderungen im echten Browser prüfen (dunkel, hell, 390 px).
- Live-Seite kommt aus Branch `gh-pages` (Inhalt von `dist/`), Ablauf im Vault unter `Projekt/Veröffentlichen.md`.
- In iCloud Drive nur Notizen: kein Klonen, kein `npm install`, kein Build.

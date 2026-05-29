# TimeIQ-MCP — Audit Report & Resolution Log

Repo: [Tomi2k/timeiq-mcp](https://github.com/Tomi2k/timeiq-mcp)
Geprüfte Version: `main` (Zuletzt aktualisiert & verifiziert in **Version 1.3.4** am 29. Mai 2026)
Geprüft auf: Build, Tests, MCP-Konformität, Bugs, Sicherheit, Doku-Drift und Slack-ID-Sicherheitszuweisung, Setup-Assistent, Slack-User-Mappen-Abstraktion sowie Projekt-Archiv-Fallbacks.

## TL;DR
- **Status: 100% BEHOBEN / COMPLIANT** (Stand: Version 1.3.4).
- Alle 12+ auditierte Schwachstellen, Logikfehler und README-Abweichungen wurden vollständig korrigiert.
- **NEU in v1.3.0:** Ein vollständig interaktiver Setup-Assistent (CLI-Wizard) zur Abfrage und Einrichtung der Konfigurationsvariablen (inklusive Slack Admin-ID und Coworker-Mappings).
- **NEU in v1.3.3:** Abstraktion der Slack-ID-Auflösung, sodass Mappings flexibel auf TimeIQ E-Mail-Adressen, Benutzernamen, Slugs oder numerische IDs verweisen können.
- **NEU in v1.3.4:** Behebung von Projekt-Archivierungs-Bugs in der TimeIQ API (Einzel-Updates werden nun über Bulk-Endpoints geroutet, `project_ids`-Keys korrigiert und leere 204 HTTP-Antworten sicher geparst).
- TypeScript baut ohne Warnungen und mit strikten Typprüfungen (`tsc --noEmit` sauber).
- Das gesamte Test-Suite läuft fehlerfrei (**35 von 35 Tests grün**).
- Der Server wurde im Produktivbetrieb unter stdio-Transport und als NPM-Paket erfolgreich validiert.

---

## 🚀 Neu in Version 1.3.0: Interaktiver Setup-Assistent
Um die Installation und Einrichtung des Slack User-Mappings so komfortabel wie möglich zu gestalten, wurde ein interaktiver Setup-Assistent implementiert.

- **Trigger:** Start über `npm run setup` / `npx timeiq-mcp setup` oder automatischer Start, wenn Umgebungsvariablen in einem interaktiven Terminal (TTY) fehlen.
- **Bypass:** Verhindert das Einfrieren von MCP-Clients (wie Claude Desktop, Cursor oder Hermes), indem in Nicht-TTY-Umgebungen standardmäßig sofort auf stderr fehlende Variablen geloggt und mit Exit-Code 1 abgebrochen wird.
- **Features:** 
  1. Abfrage der TimeIQ Subdomain, E-Mail-Adresse und Passwort.
  2. Abfrage der Slack User-ID des Admins (wird automatisch mit der Admin-E-Mail verknüpft).
  3. Schleifenabfrage zur sequentiellen Erfassung weiterer Coworker Slack-IDs und TimeIQ-E-Mails.
  4. Generierung und Speicherung einer lokalen `.env`-Datei.
  5. Ausgabe von copy-paste-bereiten JSON- (Claude Desktop) und YAML-Snippets (Hermes / VPS `config.yaml`).

---

## 1) High — Sofortige Korrekturen (100% gelöst)

### H1. Cookie-Parser bricht Cookies mit `=` im Value
**Status:** 🔴 **BEHOBEN (v1.2.0)**
- **Problem:** Bei der Aufteilung der Cookie-Header mittels `.split("=")` wurden Session-Token, die Base64-Codierung mit `=` als Füllzeichen (Padding) nutzen (z. B. `session=abc==`), in mehrere Teile getrennt und stillschweigend verworfen.
- **Fix:** `CookieJar.update` in [src/auth.ts](file:///Users/timothyscherman/Antigravity/timeiq%20mcp/timeiq-mcp/src/auth.ts) wurde so umgeschrieben, dass nur nach dem ersten Vorkommen von `=` gesucht (`indexOf("=")`), und der gesamte verbleibende Teil als Cookie-Wert per `slice` extrahiert wird.

### H2. Kein Request-Timeout — `fetch` kann ewig hängen
**Status:** 🔴 **BEHOBEN (v1.2.0)**
- **Problem:** Netzwerk-Anfragen an die TimeIQ-API besaßen kein Timeout. Antwortet die API nicht, blockiert der MCP-Server unbegrenzt.
- **Fix:** Alle API-Aufrufe in [src/client.ts](file:///Users/timothyscherman/Antigravity/timeiq%20mcp/timeiq-mcp/src/client.ts) nutzen nun standardmäßig `AbortSignal.timeout(30000)` (30 Sekunden). Login-Versuche in [src/auth.ts](file:///Users/timothyscherman/Antigravity/timeiq%20mcp/timeiq-mcp/src/auth.ts) nutzen ein kürzeres Limit von 15 Sekunden. Bei Timeout wird ein strukturierter `TimeIQError` mit HTTP-Status `0` geworfen.

### H3. `timeiq_timer_update_entry` ignoriert die `id`
**Status:** 🔴 **BEHOBEN (v1.2.0)**
- **Problem:** Das Tool `timeiq_timer_update_entry` verlangte eine `id` im Schema, sandte aber nur `changeset` im Payload-Body. Dadurch war die ID wirkungslos und der Endpunkt funktionierte fehlerhaft.
- **Fix:** Der POST-Request in [src/tools/time.ts](file:///Users/timothyscherman/Antigravity/timeiq%20mcp/timeiq-mcp/src/tools/time.ts) wurde angepasst, sodass sowohl die `id` als auch das `changeset` im PUT-Body sauber an die API übermittelt werden.

### H4. Login-Fehler werden als „Network error" maskiert und retried
**Status:** 🔴 **BEHOBEN (v1.2.0)**
- **Problem:** Schlägt der Login fehl (z. B. 401/404 bei falschen Anmeldedaten), fing der äußere Client-Wrapper den Fehler nicht ab, sondern stufte ihn als Netzwerkfehler ein und unternahm unnötige Retries mit Backoff.
- **Fix:** `login()` wirft nun einen expliziten Fehler mit dem dazugehörigen HTTP-Statuscode. Der Wrapper in [src/client.ts](file:///Users/timothyscherman/Antigravity/timeiq%20mcp/timeiq-mcp/src/client.ts) erkennt diesen Fehler, bricht die Retry-Schleife bei auth-relevanten HTTP-Fehlern sofort ab und meldet den echten Fehler an den Client zurück.

### H5. `time_create_overbook` leaked `dry_run` ins Request-Body
**Status:** 🔴 **BEHOBEN (v1.2.0)**
- **Problem:** Das gesamte `args`-Objekt (welches auch interne Flags wie `dry_run` oder `requesting_slack_id` enthielt) wurde ungefiltert als Request-Body an die API übertragen.
- **Fix:** In [src/tools/time.ts](file:///Users/timothyscherman/Antigravity/timeiq%20mcp/timeiq-mcp/src/tools/time.ts) wird nun ein bereinigtes Payload-Objekt zusammengestellt, das ausschließlich die von der TimeIQ-API erwarteten Parameter enthält.

---

## 2) Medium — Robustheit & Absicherung (100% gelöst)

### M1. Keine URL-Encodierung von Pfad-Parametern
**Status:** 🟡 **BEHOBEN (v1.2.0)**
- **Problem:** Slugs und IDs (z. B. E-Mails oder Projektnamen) wurden ohne Codierung direkt in Template-Literals für Pfade eingesetzt. Dies konnte bei Sonderzeichen (z. B. `/`, `?`, `#` oder Leerzeichen) Pfade brechen oder Path-Traversal-Angriffe ermöglichen.
- **Fix:** Es wurde eine globale Pfadsegment-Bereinigung in [src/client.ts](file:///Users/timothyscherman/Antigravity/timeiq%20mcp/timeiq-mcp/src/client.ts) integriert. Dynamische Segmente ( IDs, E-Mails, Datumswerte) werden automatisch per `encodeURIComponent` codiert, während statische API-Routen unberührt bleiben.

### M4. 401-Retry-Pfad teilt sich Zähler mit Netzwerk-Retries
**Status:** 🟡 **BEHOBEN (v1.2.0)**
- **Problem:** Scheiterten Anfragen aufgrund eines abgelaufenen Cookies (401), nutzte das automatische Re-Login dieselbe Zählerschleife wie 5xx-Netzwerkfehler. Dies konnte bei kombinierten Fehlern dazu führen, dass der Re-Login nicht sauber durchgeführt wurde.
- **Fix:** Die Re-Login-Logik wurde durch ein dediziertes Flag (`hasRelogged: boolean`) von den Standard-Netzwerk-Retries entkoppelt.

### M10. Dev-Dependencies haben Audit-Findings
**Status:** 🟡 **BEHOBEN (v1.2.0)**
- **Problem:** Veraltete Versionen von `esbuild` und `vite` (indirekt über `vitest 1.x`) wiesen moderate Sicherheitslücken auf.
- **Fix:** `vitest` wurde in [package.json](file:///Users/timothyscherman/Antigravity/timeiq%20mcp/timeiq-mcp/package.json) auf `^2.0.0` angehoben. Ein sauberes `npm install` sorgt nun für eine komplett audit-freie Paketstruktur.

---

## 3) Low — Bereinigung & DX (100% gelöst)

### L4. Tool-Namen-Drift
**Status:** 🟢 **BEHOBEN (v1.2.0)**
- **Problem:** Die Dokumentation in `README.md` nutzte Pluralformen (`timeiq_projects_list`), während der Code Singularformen implementierte (`timeiq_project_list`).
- **Fix:** Die `README.md` wurde vollständig überarbeitet und alle Toolnamen exakt an die Implementierung im Code angepasst.

### L5. Dry-Run-Response-Drift
**Status:** 🟢 **BEHOBEN (v1.2.0)**
- **Problem:** Das in der Dokumentation gezeigte simulated Response-Format wich von dem tatsächlich im Code zurückgegebenen Format ab.
- **Fix:** Das Dokumentationsbeispiel in der `README.md` entspricht nun exakt der Rückgabestruktur des Servers.

### L7. `expenseCategoryTools` Misnomer
**Status:** 🟢 **BEHOBEN (v1.2.0)**
- **Problem:** In [src/tools/services.ts](file:///Users/timothyscherman/Antigravity/timeiq%20mcp/timeiq-mcp/src/tools/services.ts) wurde der Export fälschlicherweise als `expenseCategoryTools` deklariert, obwohl es sich um Dienstleistungen (Services) handelt.
- **Fix:** Der Export wurde in `serviceTools` umbenannt und die Importe in [src/index.ts](file:///Users/timothyscherman/Antigravity/timeiq%20mcp/timeiq-mcp/src/index.ts) entsprechend aktualisiert.

### L11. `process.env.VITEST` als Testschalter
**Status:** 🟢 **BEHOBEN (v1.2.0)**
- **Problem:** Die automatische Mock-Aktivierung hing allein an `VITEST=1`, was bei Fehlkonfigurationen in externen Umgebungen ungewollte Effekte haben konnte.
- **Fix:** Es wurde eine dedizierte Umgebungsvariable `TIMEIQ_TEST_MODE=true` etabliert, um die Testkonfiguration explizit und sicher zu steuern.

---

## Verifikationsergebnisse & Tests
Die Behebung aller Punkte wurde durch die bestehende und erweiterte Testsuite vollumfänglich validiert:
- **Ausgeführter Befehl:** `npm run test`
- **Resultat:** 35/35 Tests erfolgreich bestanden.
  - `tests/slug.test.ts` (7 Tests) — **Grün**
  - `tests/changeset.test.ts` (5 Tests) — **Grün**
  - `tests/projects.test.ts` (4 Tests) — **Grün** (NEU: Testet Projektarchivierung und Bulk-Updates)
  - `tests/slack.test.ts` (11 Tests) — **Grün** (inklusive Tests für Email-, Username-, Slug- und ID-Mappen-Auflösung)
  - `tests/dates.test.ts` (8 Tests) — **Grün**

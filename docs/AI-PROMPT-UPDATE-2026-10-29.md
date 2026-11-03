# Process generation instructions — 29 October 2026

## English

Prompt revision `2026-10-29.1` uses one credential-free instruction module and one output contract for server generation, copied assistant requests and browser tools. External requests now carry the complete schema and the same operation, authoritative source, mode and scope as the server. An edit against an outdated source is rejected rather than silently applying it to the wrong draft. Browser reads include the shared instructions, schema, scope and source/draft match status; draft submissions advertise the actual model schema.

The instructions explicitly address multilingual current/future meaning, conflicting source facts, distinct processes and versions, and unsupported connections. A deterministic section parser recognises explicit English, Estonian, French and German headings. Numbered requirements remain future requirements across blank lines; current sections, saved clarifications and sibling Markdown headings close the appropriate context. Ordinary need words do not classify prose as future. The parser preserves source quotations and also protects system-card evidence.

The model, reasoning setting, API credentials, audience and output schema version remain the existing ones. There is no additional model request or automatic retry. Tests cover all four languages, false positives, source-backed cards, all instruction surfaces, stale external edits and clarification context. Browser checks exercised both read/write tools, rejected a stale version without changing the draft, opened a valid unapproved draft and displayed the complete copied request. The build and secret scan passed. Provider responses were simulated in automated tests: no paid model comparison was performed, so this is not a measured claim of higher semantic accuracy.

The exact updated Estonian-output instruction text and a request template with a source placeholder are in `ai-prompt-update-2026-10-29/`. The earlier `ai-prompt-review-2026-10-29/` directory, when present in a local workspace, records the pre-change version rather than the current one.

## Eesti

Juhise versioon `2026-10-29.1` annab serverile, kopeeritavale AI-päringule ja brauseritööriistadele ühised reeglid ning väljundskeemi. Kopeeritav päring sisaldab sama toimingut, lähtekonteksti, režiimi ja ulatust. Muudetud kirjeldusega vastuolus oleva vana mustandi muutmispäring peatatakse. Brauseritööriistade kaudu saab assistent täieliku juhise, skeemi ja info kirjelduse ning mustandi vastavuse kohta.

Täpsustati praeguse töökorralduse ja tulevikusoovide, vastuolude, eri protsesside ning tõendamata seoste käsitlemist. Tehniline järelkontroll tunneb selgeid inglise-, eesti-, prantsus- ja saksakeelseid jaotisepealkirju. Nummerdatud tulevikusoovid jäävad samasse jaotisse ka tühjade ridade korral; tavaline sõna „vajadus“ ei muuda teksti tulevikusooviks. Kontroll hõlmab ka tarkvarasüsteemide tõendeid ja säilitab algsed tsitaadid.

API seadistus ja mudel jäid samaks; lisapäringuid ei tehta. Automatiseeritud kontrollides kasutati simuleeritud mudelivastuseid. Brauseris kontrolliti prompti nähtavust, mõlema tööriista toimimist, vana versiooni tõrjumist ning ülevaatamata mustandi avamist. Ehitus ja saladuste kontroll läbisid. Tasulist mudelite või promptide kvaliteedivõrdlust ei tehtud, seega sisulise täpsuse kasvu protsenti ei väideta.

Uuendatud täielik prompt ja lähteandmete kohatäitega päringumall on kaustas `ai-prompt-update-2026-10-29/`. Varasem ülevaatuse kaust kirjeldab muudatuseelset olukorda.

## Français

La révision `2026-10-29.1` partage les instructions et le schéma entre le serveur, les requêtes copiées et les outils du navigateur. Elle précise le traitement des exigences futures, des contradictions, des processus distincts et des liens non étayés. Le contrôle des sections reconnaît les titres explicites en anglais, estonien, français et allemand sans classer de simples mots dans le texte comme des projets futurs. Les listes numérotées conservent leur contexte. Une modification fondée sur une description périmée est rejetée.

Les tests automatisés, la compilation, le contrôle des secrets et les vérifications des outils dans le navigateur ont été réalisés. Les paramètres et identifiants API existants sont conservés. Aucun appel payant de comparaison n'a été effectué : aucune amélioration sémantique chiffrée n'est revendiquée. Le prompt complet actualisé pour une sortie en estonien et le modèle de requête sont disponibles dans `ai-prompt-update-2026-10-29/`.

## Deutsch

Revision `2026-10-29.1` verwendet gemeinsame Anweisungen und ein gemeinsames Ausgabeschema für Server, kopierte Anfragen und Browserwerkzeuge. Die Regeln behandeln zukünftige Anforderungen, Widersprüche, getrennte Prozesse und unbelegte Verbindungen genauer. Die Abschnittsprüfung erkennt ausdrückliche englische, estnische, französische und deutsche Überschriften. Gewöhnliche Bedarfsformulierungen werden nicht pauschal als Zukunftspläne eingestuft. Nummerierte Anforderungen behalten ihren Kontext; Änderungen an einem veralteten Entwurf werden abgewiesen.

Automatisierte Tests, Build, Geheimnisprüfung und Browserwerkzeuge wurden geprüft. Die vorhandenen API-Einstellungen bleiben erhalten. Es gab keinen kostenpflichtigen Qualitätsvergleich; eine messbare Verbesserung der inhaltlichen Genauigkeit wird daher nicht behauptet. Der aktualisierte vollständige Prompt für estnische Ausgaben und die Anfragevorlage stehen in `ai-prompt-update-2026-10-29/`.

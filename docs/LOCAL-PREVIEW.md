# Local compiled preview — 29 October 2026

## English

Run `pnpm build`, then `pnpm start`. Open the printed address, normally `http://127.0.0.1:8787`. The browser port stays stable so saved work returns after restart; the private Worker uses an automatically allocated port. If the browser port is unavailable, stop the other preview or select another explicitly with `pnpm start --port 8788`. Use `pnpm start --port 0` for a temporary free port. Browser storage belongs to the exact address and port: export Markdown before switching addresses.

The preview streams requests to the compiled Worker through a local HTTP transport, closes normal HTTP connections and preserves WebSocket upgrades. It does not retry POSTs or change authentication. The optional `pnpm check:runtime <printed-url>` uses synthetic data, tests the 5-second connection boundary and makes no model call; valid source is used only if the configuration endpoint confirms no model key is bound. Use `pnpm dev` for development. This starts no hosted deployment.

## Eesti

Käivita `pnpm build` ja seejärel `pnpm start`. Ava väljatrükitud aadress, tavaliselt `http://127.0.0.1:8787`. Brauseri port püsib samana, et salvestatud töö taastuks ka pärast taaskäivitamist; sisemine Worker saab automaatselt vaba pordi. Kui brauseri port on hõivatud, peata teine eelvaade või vali teine port käsuga `pnpm start --port 8788`. Ajutise vaba pordi valib `pnpm start --port 0`. Brauseri salvestus kuulub täpselt aadressile ja pordile: enne aadressi vahetamist ekspordi Markdown.

Eelvaate kohalik HTTP-vahendus edastab päringud ehitatud Workerile, sulgeb tavalised HTTP-ühendused ja säilitab WebSocketid. POST-päringuid ei korrata ega autentimist muudeta. Valikuline `pnpm check:runtime <kuvatud-aadress>` kasutab sünteetilisi andmeid, kontrollib viiesekundilist ühenduse piirjuhtu ega kutsu mudelit: korrektset algteksti saadetakse ainult siis, kui seadistusvastus kinnitab API-võtme puudumist. Arenduseks kasuta `pnpm dev`. Need käsud ei avalda lehte.

## Français

Exécutez `pnpm build`, puis `pnpm start`. Ouvrez l’adresse affichée, normalement `http://127.0.0.1:8787`. Le port du navigateur reste fixe pour retrouver le travail enregistré après redémarrage ; le Worker interne utilise un port libre. Si le port est occupé, arrêtez l’autre aperçu ou choisissez `pnpm start --port 8788`. `pnpm start --port 0` sélectionne un port temporaire. Le stockage appartient à l’adresse et au port exacts : exportez en Markdown avant d’en changer.

Le transport HTTP local transmet les requêtes au Worker compilé, ferme les connexions HTTP ordinaires et préserve les WebSockets. Il ne répète pas les POST et ne modifie pas l’authentification. `pnpm check:runtime <adresse-affichée>` utilise des données fictives et teste la limite de connexion de cinq secondes sans appel au modèle ; un texte valide n’est envoyé que si la configuration confirme l’absence de clé. Utilisez `pnpm dev` pour développer. Aucun déploiement n’est effectué.

## Deutsch

Führen Sie `pnpm build` und danach `pnpm start` aus. Öffnen Sie die angezeigte Adresse, normalerweise `http://127.0.0.1:8787`. Der Browser-Port bleibt gleich, damit gespeicherte Arbeit nach einem Neustart wieder verfügbar ist; der interne Worker erhält einen freien Port. Bei belegtem Port stoppen Sie die andere Vorschau oder verwenden `pnpm start --port 8788`. `pnpm start --port 0` wählt einen temporären Port. Der Browserspeicher gehört zur genauen Adresse einschließlich Port: Exportieren Sie Markdown vor einem Wechsel.

Der lokale HTTP-Transport leitet Anfragen an den kompilierten Worker weiter, schließt normale HTTP-Verbindungen und erhält WebSocket-Upgrades. POST-Anfragen werden nicht wiederholt; die Authentifizierung bleibt unverändert. `pnpm check:runtime <angezeigte-adresse>` prüft mit fiktiven Daten die Verbindungsgrenze von fünf Sekunden ohne Modellaufruf; gültiger Quelltext wird nur gesendet, wenn die Konfiguration das Fehlen eines Schlüssels bestätigt. Für Entwicklung verwenden Sie `pnpm dev`. Diese Befehle veröffentlichen die Website nicht.

# Rejected model drafts — 28 October 2026

The UI previously discarded `details` returned with `INVALID_DRAFT`. It now shows bounded application validation messages as plain text in an expandable section. Four-language guidance explains that a rejected model response does not prove that the user's source is wrong. Provider error bodies are not displayed. The earlier diagram and input remain available; no automatic paid retry is introduced and validation rules are unchanged.

The reported input was the 23,846-byte four-language Process Studio user guide, containing both usage instructions and an expense example. The original response details were not retained in production logs, so the precise failed rule from that original attempt is unknown. A hosted repeat with the unchanged file produced: `System evidence must name the selected system.` The model instructions now explicitly require the registered product name inside the exact supporting quotation, not merely elsewhere in a document or its title. If that evidence is absent, the system must remain unknown. The validator is unchanged; unsupported assignments are still rejected. Multilingual repetition and mixed examples are possible modelling challenges, not a proven cause.

## User guidance

- **ET:** Veateate juures ava „Kontrolli tehnilised üksikasjad”. Fail võib olla korrektne ka siis, kui AI tulemus ei läbinud kontrolli. Mitme protsessi või tõlke puhul vali vajadusel üks protsess ja üks keel ning proovi uuesti. Uus loomine kasutab mudeliteenust.
- **EN:** Open “Technical check details” below the error. A valid source can still produce an invalid AI draft. If several processes or translations are present, select one process and one language if needed, then retry. Generation uses the model service.
- **FR:** Ouvrez « Détails techniques du contrôle » sous l’erreur. Une source correcte peut produire un brouillon IA invalide. Si nécessaire, sélectionnez un processus et une langue avant de réessayer. La génération utilise le service de modèle.
- **DE:** Öffnen Sie „Technische Prüfdetails“ unter der Fehlermeldung. Auch ein gültiger Quelltext kann einen ungültigen KI-Entwurf ergeben. Wählen Sie bei Bedarf einen Prozess und eine Sprache und versuchen Sie es erneut. Die Erstellung nutzt den Modelldienst.

Validation: 110 automated tests passed, including diagnostic bounds, malformed details, provider-body exclusion and four-language guidance; TypeScript passed. Business correctness remains subject to human review.

# Markdown : de la discussion au diagramme, puis retour

Process Studio v0.11 · 28 octobre 2026 · Complément au guide utilisateur

1. Demandez à votre assistant de sauvegarder la discussion dans un fichier `.md`. Séparez les pratiques actuelles, les propositions et les questions ouvertes.
2. Choisissez **Ouvrir un fichier Markdown**, vérifiez l’aperçu, puis **Utiliser comme description**. Le texte saisi est remplacé ; le diagramme actuel est conservé.
3. Vérifiez le texte et lancez la génération du diagramme. C’est cette action qui envoie la description au modèle IA et utilise le service.
4. Vérifiez le diagramme. Sélectionnez une étape pour examiner sa source et corriger son domaine d’activité ou sa fiche système. Répondez aux questions. Pour modifier les activités ou connexions, décrivez le changement puis appliquez-le : cela crée une proposition de processus futur, to-be. Choisissez une lecture horizontale ou verticale. Le déplacement des étapes par glisser-déposer n’est pas disponible.
5. Choisissez **Exporter en Markdown** dans l’en-tête. Le fichier contient le processus détaillé complet, même depuis la vue d’ensemble client : diagramme Mermaid, étapes, rôles, systèmes, domaines, connexions, preuves, questions et source. Les textes modifiés, commandes et réponses non appliqués sont séparés.
6. Joignez le `.md` téléchargé à votre chat pour poursuivre l’analyse. Le fichier inclut une suggestion de demande. L’affichage du diagramme dépend de la prise en charge de Mermaid par le chat.
7. Rouvrez le Markdown sur le site. Un fichier Process Studio inchangé permet de **Restaurer le processus enregistré** sans appel IA. Une nouvelle version à vérifier est créée ; le diagramme précédent reste dans l’historique local. Le sens et les textes en attente sont restaurés ; la langue d’interface reste celle choisie.
8. Si le texte lisible ou le diagramme a été modifié dans le chat, choisissez **Utiliser comme description**, puis générez un nouveau diagramme. La restauration de l’ancien instantané est désactivée pour ne pas ignorer les modifications.

## Limites et sauvegarde

- Fichiers UTF-8 `.md` ou `.markdown`, jusqu’à 2 000 000 octets. La description à analyser est limitée à 120 000 caractères ; réduisez le périmètre si nécessaire.
- Markdown conserve un instantané du processus, pas l’ensemble de l’historique. Téléchargez une copie avant d’autres changements. Vous devez joindre vous-même le fichier au chat.
- Ouvrir, restaurer et exporter ne déclenche aucun appel IA. Générer, clarifier avec l’IA et appliquer une modification utilisent le service de modèle existant.
- Vérifiez les sources et notes avant partage : le fichier contient toutes les informations de processus fournies. Une personne compétente doit confirmer les faits métier.
- La saisie texte et les exports JSON, SVG et Mermaid restent disponibles. Ce complément ne met pas à jour les anciens guides PDF v0.7.

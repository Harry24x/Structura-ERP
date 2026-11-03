# Process Studio — file input / failisisend / import de fichiers / Dateiimport

Updated: 29 October 2026. This supplement replaces earlier instructions that limit source-file input to Markdown. It does not add new output formats.

## English

1. Refresh Process Studio and choose **Open text file** under the process description.
2. Select a PDF, Word **.docx**, TXT, **.md** or **.markdown** file.
3. Read the **Text from file** preview. Check names, decision conditions, tables and the order of paragraphs against the original.
4. Choose **Use as description**. This replaces the input text and clears pending change text and clarification answers. You can edit the text in the description field. The existing diagram stays visible until you generate a new draft.
5. Select **Generate diagram** when the description is ready. Check the resulting draft before marking it reviewed.

Files are read locally in your browser. Opening or previewing a file does not call AI. Generating sends the description to the configured AI service. File preview is not a file backup; export the process to retain your work.

- PDF: up to 20 MB and 200 pages. Selectable text is extracted. Images are not read and OCR is not included. A scanned PDF needs OCR first. Pages with no readable text are listed; for a partially readable PDF, confirm that you checked the missing pages before using the available text. A page containing both text and images may still have omitted image content. Check columns and tables yourself. Password-protected PDFs require an unlocked copy.
- Word: up to 20 MB, **.docx** only. Paragraph and table text is extracted; page layout, images and some special document content may be omitted. Save old **.doc** files as **.docx** first.
- TXT and Markdown: up to 2 MB. Use UTF-8, or UTF-16 with its byte-order mark. If encoding fails, save as UTF-8.
- Extracted input is limited to 120,000 characters. Longer documents are rejected without silently cutting off the text; split them into sections.
- **Choose another file** replaces the preview. **Cancel file reading** or closing the panel stops the import. Errors leave the description and current diagram unchanged.
- An unchanged Process Studio Markdown export can also offer **Restore saved process**, which restores its saved process without AI. PDF, DOCX and TXT are text inputs; they do not restore a saved diagram.

## Eesti

1. Värskenda Process Studio lehte ja vajuta protsessi kirjelduse all **Ava tekstifail**.
2. Vali PDF-, Wordi **.docx**, TXT-, **.md** või **.markdown** fail.
3. Vaata üle **Tekst failist** eelvaade. Võrdle algdokumendiga nimesid, otsuste tingimusi, tabeleid ja lõikude järjekorda.
4. Vajuta **Kasuta kirjeldusena**. See asendab sisendteksti ning tühjendab ootel muudatuse teksti ja täpsustavad vastused. Kirjelduse väljal saad teksti parandada. Senine diagramm jääb nähtavale kuni uue mustandi loomiseni.
5. Kui kirjeldus on valmis, vajuta **Loo diagramm**. Kontrolli tulemust enne selle ülevaadatuks märkimist.

Faili loetakse sinu brauseris. Faili avamine ja eelvaade ei käivita AI-päringut. Diagrammi loomisel saadetakse kirjeldus seadistatud AI-teenusele. Eelvaade ei ole faili varukoopia; töö säilitamiseks ekspordi protsess.

- PDF: kuni 20 MB ja 200 lehekülge. Loetakse tekstikihti. Pilte ei loeta ja tekstituvastust (OCR) ei tehta. Skannitud PDF-ile tuleb esmalt teha OCR. Loetava tekstita lehekülgede numbrid kuvatakse; osalise tulemuse kasutamiseks kinnita, et oled puuduvad lehed üle kontrollinud. Ka teksti ja pilte sisaldavalt lehelt võib pildis olev info puududa. Kontrolli veerge ja tabeleid. Parooliga PDF-ist salvesta lukustamata koopia.
- Word: kuni 20 MB, ainult **.docx**. Loetakse lõikude ja tabelite tekst; lehe kujundus, pildid ja osa erisisust võivad puududa. Vanem **.doc** salvesta esmalt **.docx** vormingusse.
- TXT ja Markdown: kuni 2 MB. Kasuta UTF-8 kodeeringut või baitide järjekorra märgisega UTF-16 kodeeringut. Kodeeringuvea korral salvesta UTF-8 kujul.
- Loetud teksti piir on 120 000 märki. Pikemat teksti ei kärbita märkamatult: jaga dokument osadeks.
- **Vali teine fail** asendab eelvaate. **Katkesta faili lugemine** või paneeli sulgemine katkestab impordi. Vea korral jäävad kirjeldus ja senine diagramm muutmata.
- Muutmata Process Studio Markdown-ekspordis võib olla ka **Taasta salvestatud protsess**, millega taastad protsessi ilma AI-ta. PDF, DOCX ja TXT on tekstisisendid ega taasta salvestatud diagrammi.

## Français

1. Actualisez Process Studio et choisissez **Ouvrir un fichier texte** sous la description du processus.
2. Sélectionnez un PDF, un fichier Word **.docx**, TXT, **.md** ou **.markdown**.
3. Vérifiez l’aperçu **Texte du fichier** : noms, conditions de décision, tableaux et ordre des paragraphes.
4. Utilisez l’action permettant d’employer le texte comme description. Elle remplace le texte saisi et efface la modification en attente ainsi que les réponses de clarification. Corrigez ensuite la description si nécessaire. Le diagramme existant reste visible jusqu’à la génération d’un nouveau brouillon.
5. Lancez la génération du diagramme, puis vérifiez le résultat avant de le marquer comme relu.

La lecture du fichier se fait dans votre navigateur, sans appel à l’IA. La génération transmet la description au service d’IA configuré. L’aperçu ne constitue pas une sauvegarde du fichier ; exportez le processus pour conserver votre travail.

- PDF : au maximum 20 Mo et 200 pages. Seule la couche texte est extraite. Les images ne sont pas lues et l’OCR n’est pas inclus. Un PDF numérisé nécessite d’abord une reconnaissance de texte. Les pages sans texte lisible sont indiquées ; confirmez leur vérification avant d’utiliser une extraction partielle. Une page mêlant texte et images peut aussi perdre le contenu des images. Vérifiez colonnes et tableaux. Fournissez une copie déverrouillée si le PDF est protégé par mot de passe.
- Word : au maximum 20 Mo, **.docx** uniquement. Texte des paragraphes et tableaux ; les images, la mise en page et certains contenus particuliers peuvent être omis. Convertissez d’abord les anciens **.doc** en **.docx**.
- TXT et Markdown : au maximum 2 Mo. UTF-8 ou UTF-16 avec marque d’ordre des octets. En cas d’erreur d’encodage, réenregistrez en UTF-8.
- Limite : 120 000 caractères extraits. Un document plus long est refusé sans troncature silencieuse ; divisez-le.
- Choisir un autre fichier remplace l’aperçu. Annuler la lecture ou fermer le panneau interrompt l’import. Une erreur laisse la description et le diagramme inchangés.
- Un export Markdown Process Studio non modifié permet aussi de restaurer le processus enregistré sans IA. PDF, DOCX et TXT servent de descriptions textuelles et ne restaurent pas un diagramme enregistré.

## Deutsch

1. Laden Sie Process Studio neu und wählen Sie unter der Prozessbeschreibung **Textdatei öffnen**.
2. Wählen Sie PDF, Word **.docx**, TXT, **.md** oder **.markdown**.
3. Prüfen Sie die Vorschau **Text aus Datei**: Namen, Entscheidungsbedingungen, Tabellen und Absatzreihenfolge.
4. Übernehmen Sie den Text als Beschreibung. Dadurch werden der Eingabetext ersetzt sowie ausstehender Änderungswunsch und Klärungsantworten geleert. Bearbeiten Sie die Beschreibung bei Bedarf. Das bisherige Diagramm bleibt bis zur Erstellung eines neuen Entwurfs sichtbar.
5. Erstellen Sie das Diagramm und prüfen Sie es, bevor Sie es als geprüft markieren.

Die Datei wird in Ihrem Browser gelesen. Öffnen und Vorschau lösen keinen KI-Aufruf aus. Bei der Diagrammerstellung wird die Beschreibung an den eingerichteten KI-Dienst gesendet. Die Vorschau ist keine Dateisicherung; exportieren Sie den Prozess, um Ihre Arbeit zu behalten.

- PDF: höchstens 20 MB und 200 Seiten. Die Textebene wird ausgelesen. Bilder werden nicht gelesen; OCR ist nicht enthalten. Gescannte PDFs benötigen zuerst Texterkennung. Seiten ohne lesbaren Text werden aufgelistet. Bestätigen Sie deren Prüfung, bevor Sie eine unvollständige Extraktion übernehmen. Auch Seiten mit Text und Bildern können Bildinhalte verlieren. Prüfen Sie Spalten und Tabellen. Passwortgeschützte PDFs benötigen eine entsperrte Kopie.
- Word: höchstens 20 MB, nur **.docx**. Absatz- und Tabellentext werden gelesen; Bilder, Seitenlayout und besondere Dokumentinhalte können fehlen. Speichern Sie ältere **.doc**-Dateien zuerst als **.docx**.
- TXT und Markdown: höchstens 2 MB. UTF-8 oder UTF-16 mit Byte-Reihenfolge-Markierung. Bei Kodierungsfehlern als UTF-8 speichern.
- Höchstens 120.000 ausgelesene Zeichen. Längere Dokumente werden ohne unbemerkte Kürzung abgelehnt; teilen Sie sie auf.
- Eine andere Datei ersetzt die Vorschau. Abbrechen oder Schließen des Bereichs beendet das Einlesen. Fehler lassen Beschreibung und Diagramm unverändert.
- Ein unveränderter Process-Studio-Markdown-Export kann den gespeicherten Prozess ohne KI wiederherstellen. PDF, DOCX und TXT liefern Text und stellen kein gespeichertes Diagramm wieder her.

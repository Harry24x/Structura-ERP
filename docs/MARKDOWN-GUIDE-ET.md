# Markdown: vestlusest diagrammini ja tagasi

Process Studio v0.11 · 28.10.2026 · Kasutusjuhendi täiendus

1. Palu vestlusabilisel salvestada arutelu `.md` failina. Hoia praegune töökorraldus, ettepanekud ja lahtised küsimused selgelt eraldi.
2. Vali lehel **Ava Markdown-fail**. Vaata eelvaadet ja vajuta **Kasuta kirjeldusena**. See asendab sisendteksti, kuid jätab praeguse diagrammi alles.
3. Kontrolli sisendteksti ja vali **Loo diagramm**. Alles see saadab kirjelduse AI-mudelile ning kasutab mudeliteenust.
4. Vaata diagramm üle. Klõpsa sammul, kontrolli allikakatket ning paranda tegevusvaldkonda või süsteemikaarti. Vasta täpsustavatele küsimustele. Sammude ja seoste muutmiseks kirjuta muudatus ning vali **Rakenda muudatus**; see loob kavandatava to-be protsessi. Diagrammi saab lugeda vasakult paremale või ülalt alla. Sammude lohistamine pole praegu toetatud.
5. Vali ülaribalt **Ekspordi Markdown**. Fail sisaldab kogu detailset protsessi ka siis, kui vaatad kliendi kokkuvõtet: Mermaid-diagramm, sammud, rollid, süsteemid, valdkonnad, seosed, allikakatked, lahtised küsimused ja algtekst. Rakendamata sisendimuudatused, muudatuskäsk ja sisestatud vastused on eraldi märgitud.
6. Lisa allalaaditud `.md` fail oma chatti. Palu protsessi analüüsida ja täpsustada. Failis on ka näidispalve arutelu jätkamiseks. Diagrammi kuvamine sõltub sellest, kas vestluskeskkond toetab Mermaid-koodi.
7. Tagasi lehele tulles ava uus Markdown-fail. Muutmata Process Studio faili saad nupuga **Taasta salvestatud protsess** taastada AI-päringuta. Taastamine loob uue kontrollimata versiooni ja säilitab eelmise diagrammi ajaloos. Taastatakse ka suund ja ootel tekstid; kasutajaliidese keel jääb sinu valituks.
8. Kui chatis on teksti või diagrammi muudetud, vali **Kasuta kirjeldusena** ja seejärel **Loo diagramm**. Vana hetktõmmise taastamine on siis keelatud, et parandused ei jääks tähelepanuta.

## Piirid ja salvestamine

- Sobivad UTF-8 `.md` ja `.markdown` failid, kuni 2 000 000 baiti. Analüüsitav kirjeldus võib olla kuni 120 000 märki; pikema arutelu puhul vali väiksem protsessiosa.
- Markdown on loetav üleandmisfail ja ühe protsessi hetktõmmis, mitte kogu versiooniajaloo varukoopia. Enne järgmisi muudatusi laadi vajalik fail alla. Chati jätkamiseks tuleb fail sinna ise lisada.
- Faili avamine, taastamine ja eksport ei kasuta AI-d. Loomine, AI-täpsustus ja muudatuse rakendamine kasutavad olemasolevat mudeliteenust.
- Enne chatis jagamist kontrolli algteksti ja märkusi: fail sisaldab kogu sisestatud protsessiinfot. Puuduvate faktide õigsust peab kinnitama protsessi tundev inimene.
- Säilivad ka senised tekstisisend, JSON, SVG ja Mermaid ekspordid. See täiendus ei muuda varasemaid v0.7 PDF-juhendeid ajakohaseks.

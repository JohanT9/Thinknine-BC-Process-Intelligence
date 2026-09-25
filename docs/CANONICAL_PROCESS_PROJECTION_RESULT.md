# BC Process Studio — etapp 1C

Dashboardens `prepareSessionModel` producerar nu Canonical Process från samma
Canonical Recording, normaliserade event, steggrupper och befintliga
tolkningsresultat som skapar reviewmodellen. Den stabila lokala kunskapspaketslistan
ges ett release-ID och normaliseringsversionen följer eventens faktiska version.

Resultatet finns som `activeReviewModel.canonicalProcess` och har formen
`{ok, process, diagnostics}`. Om valideringen misslyckas behåller dashboarden den
befintliga reviewmodellen; Canonical Process används inte för att skriva över review,
inspelning eller exporter. Projektionsfel lämnas synliga som diagnostik på modellen.
Detta gör processprojektionen tillgänglig för nästa konsument utan att byta ut den
etablerade reviewkontrakten.

Byggning, lint, syntaxkontroll och kontroll av genererade process-/schemafiler
passerade. `git diff --check` passerade med befintliga Git-radslutsvarningar. Inga
tester lades till eller kördes för 1C. Node 20 CI och full CI återstår.

Projektionsresultatet är än så länge i minnet under dashboardens aktiva modell.
Persistens, dokumentprojektion och processkarta har inte kopplats över. Nästa steg är
att granska diagnostik och ID mot verkliga inspelningar och därefter ta in godkända
konsumenter en i taget.

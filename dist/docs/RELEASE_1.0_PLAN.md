# Plan för release 1.0 i Microsoft Edge Add-ons

*Sparad 2026-11-20. Utgår från 4.7.272. Ett förslag att arbeta efter, inte ett beslut. Bocka av med bevis, som i [PILOT_RELEASE_CHECKLIST.md](PILOT_RELEASE_CHECKLIST.md).*

## Princip

Funktionerna fryses i en release-gren. Där rättas bara fel av graden BLOCKER eller MAJOR (se severity policy i pilotchecklistan). Allt nytt går till `main` och [FUTURE_FEATURES.md](FUTURE_FEATURES.md) och kommer i 1.1.

## Vecka 1 (23–27 nov): frys och städa

- [ ] Skapa `release/1.0` från 4.7.272. Visa mig följer med bara om den är stabil, annars kommer den i 1.1.
- [x] Begränsa `web_accessible_resources` till Business Central (punkt 1 i [EDGE_ADDONS_SUBMISSION.md](EDGE_ADDONS_SUBMISSION.md)). Gjort 2026-11-20 i `src/ui/manifest.json`, ej byggt eller släppt.
- [ ] Gradera varje punkt i [ATT_FIXA.md](ATT_FIXA.md) som BLOCKER, MAJOR eller MINOR. Rätta bara BLOCKER och MAJOR.
- [ ] Starta juridiken: integritetspolicy, villkor och hur länge licensdata sparas. Underlaget finns i "Data that leaves the browser" i EDGE_ADDONS_SUBMISSION.md.

## Vecka 2 (30 nov–4 dec): verifiera

- [ ] Gå igenom [PILOT_RELEASE_CHECKLIST.md](PILOT_RELEASE_CHECKLIST.md) med riktiga bevis: ren källkod, CI, build, paket, checksummor och ingen kunddata i zip-filen.
- [ ] Uppgradera med samma ID från pilotversionen och kontrollera att inspelningar, granskningar och dokument finns kvar. Viktigaste punkten.
- [ ] Prova manuellt i en ren Business Central-miljö: inspelning, granskning, Word, buggrapport och test.
- [ ] Bestäm pris, betalsätt och hur trialen övergår till betald licens.

## Vecka 3 (7–11 dec): butik och webb

- [ ] Publicera webbplatsen och lägg till supportadress och integritetspolicy.
- [ ] Butikstexterna: godkänn svenska och engelska, låt människor granska övriga språk, ta skärmbilder.
- [ ] Testmiljö i Business Central och licens för Microsofts granskare, med instruktioner.
- [ ] Migreringsanvisning för pilotanvändarna.
- [ ] De första användarguiderna: kom igång, granskning och Word.

## Vecka 4 (14–18 dec): skicka in

- [ ] Sista go/no-go och inskickning.
- [ ] Svara snabbt på frågor från granskningen. Räkna med upp till 7 arbetsdagar, längre kring jul.

## Vecka 5–6 (januari): lansering

- [ ] Släpp först till pilotkunderna via synlighetsinställningarna, sedan till alla.
- [ ] Bara bugfixar i `release/1.0`. Nya funktioner i `main` för 1.1.

## Risker

- Juridiken. Är policyn inte klar vecka 3 blir det januari.
- Uppgraderingstestet. Försvinner data är det en BLOCKER.
- Nya funktioner som smyger in i release-grenen.

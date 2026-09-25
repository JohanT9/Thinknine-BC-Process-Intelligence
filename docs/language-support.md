# Språkstöd

BC Process Studio har språkval för svenska, engelska, franska (fr-FR),
tyska (de-DE), spanska (es-ES), danska (da-DK), finska (fi-FI) och norska bokmål (nb-NO). Välj gränssnittsspråk och standardspråk
för dokument separat via globknappen i popupens sidhuvud eller i inställningarna. Nya installationer får engelska för båda språkvalen. Sparade språkval och äldre installationers svenska standard bevaras. Språket för ett enskilt processdokument
kan ändras i granskningen. Inspelningsdialogen använder dokumentspråket även
för nya felrapporter.

Den gemensamma ordlistan finns i `src/engine/locale-catalogs.js`. Den används
av gränssnittets meddelanden och statiska kontroller, processdokumentets
systemtexter och instruktioner, Word-rubriker och sidfötter samt felrapportens
rubriker, Markdown, PDF och e-postutkast. Språkregistret normaliserar även
regionala varianter som fr-CA, de-AT och es-MX till respektive standardspråk.
Norska använder bokmål; no och no-NO normaliseras till nb-NO. Nynorska ingår inte.

Språkvalet översätter inte användarens egna texter, rapporttitlar, felmeddelanden,
diagnostik eller benämningar som observerats i Business Central. Genererade
instruktioner använder översatta mallar och behåller fältnamn och värden.
Tekniska identiteter och rådata förblir oförändrade. Det externa systemets
gränssnitt och licenstjänstens separata administratörssida påverkas inte.

Testet `npm run test:new-languages` kontrollerar att alla befintliga UI-nycklar
och statiska texter finns på alla sex tilläggsspråken, att platshållare bevaras,
att eget innehåll inte ändras och att Word- och PDF-filer går att skapa.
Testet körs även via den ordinarie CI-kedjan. För nya systemtexter ska alla
språk uppdateras samtidigt. Okända tekniska systemtexter kan använda engelska
som reservspråk; detta får inte ersätta en översättning i den gemensamma ordlistan.

Efter uppdateringen: bygg med `npm run build`, ladda om tillägget i Edge och
öppna dess vyer på nytt. Språkstödet kräver ingen ändring av Azure-tjänsten.

## När ett nytt språk läggs till

Ett språk är inte färdigt bara för att gränssnittet har översatts. Vid varje
ny registrering i `src/engine/language-registry.js` ska hela kunskapsbanken
gås igenom samtidigt. Jämför alla aktiverade kunskapspaket och processområden
med de redan stödda språken: försäljning, inköp, betalningar, lager, inventering,
tillverkning och gemensamma BC-sidor. Kontrollera lokaliserade sidnamn,
fält- och åtgärdsalias, begrepp, regelns språkmetadata, Microsoft Learn-källor
och tester som faktiskt löser representativa handlingar och fält på språket.

Målet är jämn, jämförbar processtäckning mellan samtliga registrerade språk.
Uppdatera täckningsmatrisen i `docs/BC_PUBLIC_PROCESS_KNOWLEDGE.md` och
`docs/BC_PUBLIC_KNOWLEDGE_CATALOG.md` när täckningen ändras. Använd verifierade
Microsoft-termer och lokaliserade officiella källor där de finns. Om en term
eller källa inte går att verifiera ska den konkreta luckan dokumenteras; hitta
inte på en översättning och beskriv inte språkstödet som likvärdigt förrän
luckan är åtgärdad. Kör `npm run knowledge:validate` och
`npm run test:knowledge-mcp` samt relevanta språk- och gränssnittstester innan
det nya språket betraktas som klart.

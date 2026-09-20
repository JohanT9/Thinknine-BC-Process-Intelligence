# Språkstöd

BC Process Studio har språkval för svenska, engelska, franska (fr-FR),
tyska (de-DE) och spanska (es-ES). Välj gränssnittsspråk och standardspråk
för dokument separat via globknappen i popupens sidhuvud eller i inställningarna. Nya installationer får engelska för båda språkvalen. Sparade språkval och äldre installationers svenska standard bevaras. Språket för ett enskilt processdokument
kan ändras i granskningen. Inspelningsdialogen använder dokumentspråket även
för nya felrapporter.

Den gemensamma ordlistan finns i `src/engine/locale-catalogs.js`. Den används
av gränssnittets meddelanden och statiska kontroller, processdokumentets
systemtexter och instruktioner, Word-rubriker och sidfötter samt felrapportens
rubriker, Markdown, PDF och e-postutkast. Språkregistret normaliserar även
regionala varianter som fr-CA, de-AT och es-MX till respektive standardspråk.

Språkvalet översätter inte användarens egna texter, rapporttitlar, felmeddelanden,
diagnostik eller benämningar som observerats i Business Central. Genererade
instruktioner använder översatta mallar och behåller fältnamn och värden.
Tekniska identiteter och rådata förblir oförändrade. Det externa systemets
gränssnitt och licenstjänstens separata administratörssida påverkas inte.

Testet `npm run test:new-languages` kontrollerar att alla befintliga UI-nycklar
och statiska texter finns på de tre nya språken, att platshållare bevaras,
att eget innehåll inte ändras och att Word- och PDF-filer går att skapa.
Testet körs även via den ordinarie CI-kedjan. För nya systemtexter ska alla
språk uppdateras samtidigt. Okända tekniska systemtexter kan använda engelska
som reservspråk; detta får inte ersätta en översättning i den gemensamma ordlistan.

Efter uppdateringen: bygg med `npm run build`, ladda om tillägget i Edge och
öppna dess vyer på nytt. Språkstödet kräver ingen ändring av Azure-tjänsten.

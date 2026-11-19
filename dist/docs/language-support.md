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
`npm run test:knowledge` samt relevanta språk- och gränssnittstester innan
det nya språket betraktas som klart.

### Karta: allt som berörs av ett nytt språk

Kartlagd 2026-11-19. Exemplen gäller ett nytt språk `xx-XX`. Siffrorna visar
ungefär hur mycket text ett språk har i dag. Det som hämtar språken från
registret följer med automatiskt. `npm run test:language-registry`
(`tests/language-lists.test.js`) anger varje ställe nedan som saknar
texter för ett registrerat språk. Ställen som har en egen lista över
språken, och som inget test kontrollerar, är markerade **egen lista**.

#### 0. Beslut innan arbetet börjar

- **Finns Business Central på språket?** Microsofts egna texter hämtas ur
  ett lands Base Application (se avsnitt 4). Varje land har bara sitt eget
  språk. Ett språk utan eget Microsoft-land, till exempel om det bara finns
  som språkapp eller partnerlokalisering, saknar källa till sidors, fälts
  och åtgärders namn och felmeddelanden. Kunskapsbanken kan då inte nå samma
  täckning, och luckan ska dokumenteras.
- **Tecken utanför västeuropeiska alfabetet** (till exempel polska, tjeckiska,
  grekiska eller kyrilliska): felrapportens PDF använder Helvetica
  (`src/bug-report/report-pdf.mjs`, `StandardFonts`). Den kan bara visa
  WinAnsi-tecken. Andra tecken blir `[U+XXXX]`, så ett inbäddat typsnitt
  behövs först. Word och webbläsaren klarar Unicode.
- **Skrivriktning** (höger till vänster) stöds inte någonstans i
  gränssnittet eller exporterna.
- **Regionala varianter**: välj alias som `xx`, `xx-yy`. Registret normaliserar
  språkprefixet, så `fr-CA` blir `fr-FR`.

#### 1. Registret, standardval och sparade inställningar

- `src/engine/language-registry.js`: lägg till språket med locale,
  kortkod, eget namn (`nativeName`), alias och `ui`/`document`. Språkväljarna
  i popupen, inställningarna och granskningen hämtar listan härifrån.
- Standardspråken ändras inte: nya installationer får engelska, och äldre
  dokument faller tillbaka till svenska. Sparade språkval behöver ingen
  migrering, men testa ny installation, befintliga inställningar och äldre
  dokument.

#### 2. Gränssnittets och dokumentens texter (översättning)

Alla behöver hela språket, inte reservspråk:

| Fil | Innehåll | Omfattning per språk i dag |
| --- | --- | --- |
| `src/engine/locale-catalogs.js` | gemensam ordlista: gränssnitt, dokument, Word, felrapport, PDF, e-post | cirka 1 000 texter |
| `src/ui/i18n.js` | gränssnittets nycklar och tekniska meddelanden (flera block per språk) | största katalogen |
| `src/document/language-excellence.js` | tester, testsviter, mallar, protokoll | flera hundra nycklar |
| `src/document/document-language.js` | genererade dokumenttexter och mallar | cirka 25 mallar |
| `src/engine/knowledge-explanation-catalog.js` | förklaringar av arbetsmoment; språkens ordning i textlistorna (`locales`) ska hålla alla registrerade språk, vilket testet kontrollerar | cirka 135 texter |
| `src/engine/step-text.js` | stegtexter och dokumenttypernas namn; språken läses från registret, och testet anger mallar som saknas | cirka 40 rader |
| `src/document/presentation-grammar.js` | grammatik för instruktioner (Välj, Ange, i) i `STEP_WORDS`; språken läses från registret, och testet anger ord som saknas | cirka 10 block |
| `src/document/review-document-projector.js` | rubriker för förklaringar i dokumentet | 7 tabeller |
| `src/document/page-script-export.js` | texter i Page Scripting-export | 1 block |
| `src/engine/session-interpretation-pipeline.js` | text om relaterade skärmbilder | 1 text |
| `src/engine/knowledge-domain.js` | ordet för Ny och förklaringens början (rad 372–383) | 2 tabeller |
| `src/document/bc-caption-translation.js` | ordet för Ny (rad 21) | 1 tabell |
| `src/bug-report/bug-report-service.js` | felrapportens rubriker (rad 101–113) | 3 mallar |
| `src/bug-report/error-cause.js` | orsaksrutan och vanliga feltyper (rad 1449) | 1 stort block |
| `src/ui/dashboard.js` | dokumentprofiler (rad 440–470) och fler | cirka 18 ställen |
| `src/ui/welcome.js` | exempelsidan i Kom igång, med BC-texter på språket (rad 30) | 1 block |
| `src/recorder/capture-indicator-i18n.js` | inspelningsindikatorn i BC-fliken; den körs utan registret och väljer bland språken den har texter för (`languageOf`), annars engelska; testet kräver texter för alla registrerade språk | 2 block |

Översätt med produktens egna ord i alla delar. Använd Microsofts egna
benämningar för Business Central-ord (avsnitt 4). Platshållare som `{name}`
ska vara kvar. Kontrollera pluralformer, diakritiska tecken och längre
texter i den smala popupen och i inspelningspanelen.

#### 3. Kunskapsbanken

- `src/knowledge-packs/*.json` (alla aktiverade paket i `index.json`). För
  varje regel gäller:
  - `languages` och `verifiedRuntimeLocales` ska ta med språket där det är
    verifierat.
  - `localizedExplanations` ska ha en förklaring på språket. I dag har 147
    av 285 regler sådana förklaringar.
  - Mönster för sidor, åtgärder och fält ska vara Microsofts egna texter.
    Gissa aldrig, utan kontrollera mot `bc-captions.json` (avsnitt 4).
  - `sourceIds` ska peka på lokaliserade Microsoft Learn-källor (`-xx`),
    som registreras i paketens källor.
- `src/knowledge-packs/generated/bc-rule-captions.json` byggs om (avsnitt 4)
  och ger varje regel Microsofts texter på språket.
- `src/engine/bc-client-captions.js`: webbklientens egna knappar på
  språket, till exempel Stäng, Visa mer och Tillbaka. Jämför med
  `tests/fixtures/bc-client-resources.json`.
- Genererade översikter: `docs/KNOWLEDGE_LOCALE_COVERAGE.md`
  (`scripts/knowledge-locale-coverage.js`, följer registret) och
  `docs/KNOWLEDGE_PATTERN_REVIEW.md` (`scripts/knowledge-pattern-review.js`).
  Uppdatera täckningsmatrisen i `docs/BC_PUBLIC_PROCESS_KNOWLEDGE.md` och
  `docs/BC_PUBLIC_KNOWLEDGE_CATALOG.md`.

#### 4. Tabeller från Microsofts Business Central-paket

Alla byggskripten har en **egen lista** över språk och länder. Lägg till
språkets land (`xx: "xx-XX"`) i:

- `scripts/update-bc-tables.js` (`COUNTRIES`). Det hämtar varje lands Base
  Application och andra Microsoft-appar, plattformens språkresurser
  (`Microsoft.Dynamics.Nav.Language.resources.dll`) och webbklientens
  resurser.
- `scripts/build-bc-captions.js` (`COUNTRIES`) bygger
  `src/document/bc-captions.json`: sidors, fälts och åtgärders namn per språk.
  Dokumentets språkbyte och kunskapsbanken använder dem.
- `scripts/build-error-labels.js` (`LOCALES`, `COUNTRIES`) bygger
  `src/bug-report/error-labels.js` och `src/bug-report/error-known.json`:
  felmeddelanden, var de kommer ifrån och deras åtgärder.
- `scripts/build-client-resources.js` (`LOCALES`) bygger
  `tests/fixtures/bc-client-resources.json`: webbklientens knappar.
- `scripts/compare-older-captions.js` (`COUNTRIES`) jämför mönstren med
  äldre versioner och bygger `tests/fixtures/knowledge-pattern-versions.json`.

Kör `node --max-old-space-size=8192 scripts/update-bc-tables.js <version> <arbetsmapp>`,
sedan `compare-older-captions.js` och `knowledge-pattern-review.js`.
Granska skillnaden. Användarens egna .app-filer
(`src/document/app-captions.js`) läser alla registrerade språk automatiskt.

#### 5. Tester

Testerna som läser registret täcker det nya språket automatiskt. Det gäller
bland andra `language-registry`, `ui-localization`, `new-languages`,
`knowledge-rule-captions`, `step-text`, `bc-client-captions` och
`bc-caption-translation`. De visar vilka texter som saknas.

Ett tjugotal tester har en **egen lista** med ett fall per språk och behöver
ett nytt fall med Microsofts texter på språket:

- **Processområden:** `sales-purchase-localization`, `warehouse-localization`,
  `manufacturing-localization`, `projects-localization`,
  `services-localization`, `finance-localization`,
  `contact-marketing-context`, `subscription-billing-context` och
  `document-hr-context`.
- **Kunskap:** `knowledge-catalog`, `knowledge-directives`,
  `knowledge-explanation-coverage`, `knowledge-pack-page-localization`,
  `knowledge-source-integrity` och `process-language-matrix`.
- **Dokument och språkval:** `document-language`, `presentation-grammar` och
  `language-preferences`.
- **Övrigt:** `typed-and-chosen`, `bug-reporting` och `capture-quality`.
- **Fixturer:** `tests/fixtures/bc-expansion-captions.json`,
  `knowledge-localized-captions.json` och `quality-management-captions.json`.

Lägg till fall för språket i dem. Rätta inte ett test genom att ta bort ett
annat språks fall.

#### 6. Dokumentation, butik och release

- `docs/language-support.md`: språklistan i början.
- `docs/EDGE_ADDONS_SUBMISSION.md` och Edge-butikens beskrivning: vilka
  språk tillägget stöder.
- `CHANGELOG.md`, under `## Unreleased`, i användarens termer.
- `AGENTS.md`: listan över språk som stöds.
- Licenstjänstens administration (`services/licensing/admin*`) är bara på
  svenska och engelska och berörs inte.
- `scripts/capture-lab/` och `docs/prototypes/` är utvecklarverktyg och
  skisser. De behöver inte uppdateras för att språket ska vara färdigt.

#### 7. Kontroll innan språket är klart

Kör `npm run build` och `npm run check`. Kör sedan `npm run test:language-registry`,
`npm run test:ui-localization`, `npm run test:document-language`,
`npm run test:new-languages`, `npm run test:knowledge`,
`npm run knowledge:validate` och `npm run ci`.

Gå också igenom flödet för hand på språket: välj språket, spela in, granska,
exportera till Word, skapa en felrapport som PDF och e-post, och kör ett test.
Kontrollera den smala popupen med långa texter.

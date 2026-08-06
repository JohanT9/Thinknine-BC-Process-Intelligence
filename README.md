# Thinknine BC Process Intelligence v4.6.0 R1

Ett modulärt Edge-tillägg för att spela in, granska och exportera dokumenterade
Business Central-processer.

## Review Workspace Refinement 4.6 R4

Granskningsytan prioriterar nu de dagliga åtgärderna: Ångra, Gör om, Spara och
Exportera Word ligger alltid synliga. Struktur- och underhållsåtgärder som slå
samman, dela, flytta, komprimera, lägga till och slutföra finns samlade under
**Fler åtgärder**. Alla tidigare kortkommandon och kommandobeteenden finns kvar.

Instruktionseditorn har större skrivyta, tydligare radavstånd och stabil
fokusering utan oväntade scrollhopp. Exakta annotationskoordinater visas först
när de efterfrågas, medan rektangel, pil, val och borttagning ligger kvar nära
bilden. Mobil layout, high contrast och reduced motion har egna säkra regler.
Se [Review Workspace Refinement 4.6](docs/REVIEW_WORKSPACE_REFINEMENT_4.6.md).

## Semantic Interaction Rules Engine 4.6 R3

Dokumentationskedjan använder nu ett gemensamt, prioriterat regelsystem för att
översätta tekniska interaktionssekvenser till affärshändelser. Kund-, artikel-,
leverantörs-, lagerställe- och dimensionsval samt antal, datum, alternativ,
kryssrutor, generiska uppslag och fältinmatning följer samma oföränderliga
regelkontrakt. Om två likvärdiga regler konkurrerar bevaras originalhändelsen.

Varje semantisk åtgärd behåller stabila käll-ID:n, händelseordning, samtliga
skärmbilds- och annoteringsreferenser samt rå interaktionshistorik. Screenshot
Intelligence väljer fortsatt bild och Language Excellence ansvarar fortsatt
endast för formulering. Befintliga Reviews kräver ingen migrering. Se
[Semantic Interaction Engine 4.6](docs/SEMANTIC_INTERACTION_ENGINE_4.6.md).

En fältförflyttning skapar inte längre ett dokumentationssteg. Händelser som
`Ändra fältet "Sortera efter …"` tas bara med när användaren faktiskt matar in
ett nytt värde. Ett uppslag med ett verkligt radval blir ett enda val-steg och
tomma val, exempelvis `Välj leverantör` utan valt värde, visas inte.
Tekniska listprefix tas bort, så `Sortera efter Nr` presenteras som
`Välj Nr "136"`. Ett registrerat värde, exempelvis 500 i Antal, bevaras även i
äldre inspelningar där endast den avslutande focusout-källan finns kvar.

När ett fält faktiskt ändras via input eller change tas nu en egen skärmbild för
det dokumentationssteget. En inmatning av 500 i Antal får därmed en bild från
själva inmatningstillfället. Ren focusout tar ingen bild. Redan avslutade
inspelningar utan en sådan bild kan inte återskapa den retroaktivt.

Instruktioner skiljer nu på angivna värden och UI-benämningar. Ett manuellt
värde visas i fetstil, medan fältnamn, sidnamn, rapportnamn och andra benämningar
visas inom citattecken: Ange **400** i "Antal". Samma formatering används
i Dokumentvyn och Word; interna markörer visas aldrig som rå text.

## Konsoliderade affärshändelser

Tekniska delhändelser från samma kunduppslag—fältfokus, öppnad värdelista,
radval och efterföljande fältuppdatering—samlas till ett dokumentationssteg.
Ett val av kund 1033 skrivs därför som **Välj kund "1033".** med den sista
relevanta skärmbilden, samtidigt som samtliga källevent finns kvar för spårbarhet.
Samma regel gäller artikeluppslag. Ett val av artikel 136 skrivs som
**Välj artikel "136".** Rena focusout-fält efter artikelvalet ignoreras tills
nästa faktiska inmatning, exempelvis **Ange "500" i "Antal".** Antal och datum
maskeras inte längre automatiskt; uttryckliga kund-, leverantörs- och
artikelinställningar respekteras fortfarande.

## Screenshot Intelligence 4.6 R2

Screenshot Intelligence väljer deterministiskt den tydligaste tillgängliga
skärmbildskandidaten före dokumentplanering. Lagret använder endast immutable
Semantic Document, recorder-metadata, stabila referenser, annoteringsreferenser
och Document Profile. Det läser aldrig bildbytes, DOM, canvas eller Word-data.

Ensam skärmbild, manuellt val, annoteringar och ofullständig metadata har säkra
fallbackregler. Likvärdiga kandidater behåller befintligt beteende; ett val görs
bara när metadata ger en tydlig skillnad. Dokumentvy och Word konsumerar samma
Document Plan och därför samma val. Se
[Screenshot Intelligence 4.6](docs/SCREENSHOT_INTELLIGENCE_4.6.md) och
[Release Notes 4.6 R2](docs/RELEASE_NOTES_4.6_R2.md).

## Language Excellence 4.6 R1

Alla befintliga inspelningar och Reviews får nu automatiskt ett tydligare,
kortare och mer konsekvent instruktionsspråk i Dokumentvy och Word-export.
Language Excellence arbetar deterministiskt på en immutable kopia av Semantic
Document efter Review Projector och före profil, tema och planering. Review,
historik, arbetsflöde, skärmbilder, annoteringar och originalsemantik ändras inte.

Den gemensamma skrivguiden standardiserar säkra handlingsverb på svenska och
engelska och låter Document Profiles välja professionell, exakt, förklarande,
kortfattad eller diagnostisk ton. Bearbetat resultat återanvänds per dokument-
revision och profil. Se [Language Excellence 4.6](docs/LANGUAGE_EXCELLENCE_4.6.md)
och [Release Notes 4.6 R1](docs/RELEASE_NOTES_4.6_R1.md).

## Workflow Polish 4.5 UX8

Det dagliga flödet är nu snabbare och lugnare utan nya produktfunktioner.
Dokumentbiblioteket har tydligast visuell prioritet; råinspelningar, ZIP-export
och debug finns kvar under **Inspelningar och tekniska verktyg**. Vanliga
batchkommandon visas direkt medan sällsynta och destruktiva åtgärder samlas under
**Fler åtgärder**.
Inställningar för dokumentation, export och inspelning ligger i en expanderbar
sektion så den dagliga dokumentarbetsytan visas först utan att någon inställning
försvinner.

Tryck `/` för att fokusera bibliotekssökningen, Escape för att rensa den och
Ctrl/Cmd+S för att spara i Granskning. Urval och fokus uppdateras inkrementellt
utan att bygga om korten, och metadataindexet återanvänds mellan sökningar. Se
[Workflow Polish 4.5](docs/WORKFLOW_POLISH_4.5.md).

## Batch Operations 4.5 UX7

Document Library stöder nu flerval med mus och tangentbord samt en kontextuell
batch-toolbar för Word-export, favoriter, taggar, profil, tema, författare,
status, arkivering och borttagning. Endast uttryckligen markerade metadatafält
ändras. Arkivering och permanent borttagning beskriver antal, åtgärd och
reversibilitet innan de genomförs.

Batchlagret konsumerar endast biblioteksmetadata, Workspace Context-identiteter,
Document Profiles och teman. Word-exporten behandlar ett dokument i taget genom
den befintliga pipelinen; Review batchladdas aldrig. Se
[Batch Operations 4.5](docs/BATCH_OPERATIONS_4.5.md).

## Document Library 4.5 UX6

Dashboarden innehåller nu ett metadata-baserat dokumentbibliotek för snabb
återanvändning av tidigare dokumentation. Sökning omfattar titel, profil,
taggar, metadata, arbetsflöde och indexerade avsnittsnamn. Profil, tema,
dokumenthälsa, favorit, nyligen använd samt skapad/ändrad-datum kan kombineras,
och resultat kan sorteras eller grupperas per Document Profile.

Kort och snabbförhandsvisning visar endast lättviktsmetadata. Biblioteket laddar
inte Review, bygger inte Semantic Document, kör inte Planner och renderar inte
Word när det öppnas. Mer innehållsmetadata och kvalitativ Document Health
materialiseras när användaren ändå öppnar Document Workspace. Se
[Document Library 4.5](docs/DOCUMENT_LIBRARY_4.5.md).

## Smart Document Profiles 4.5 UX5

Dokumentprofilen beskriver dokumentets syfte och förväntningar utan att ändra
innehållet. Inbyggda profiler finns för Business Process, SOP, Training Guide,
Quick Reference och Troubleshooting Guide. Ett direkt profilbyte uppdaterar
Document Workspace-tema, planerad presentation, Document Health, prioriterad
vägledning och positiva bekräftelser från cachade immutable varianter.

Profilerna definierar endast förväntningar och lagras aldrig i Review. Se
[Document Profiles 4.5](docs/DOCUMENT_PROFILES_4.5.md).

## Documentation Intelligence 4.5 UX4

Document Workspace innehåller nu en lugn vägledningspanel med kvalitativ
dokumenthälsa, grupperade förbättringsförslag och filter. Vägledningen bygger på
befintliga Semantic Document-, Document Plan- och Quality Diagnostics-resultat.
Den är rådgivande, blockerar aldrig export och ändrar aldrig dokumentet.

Förslag använder Workspace Context för att visa rätt dokumentposition och
förbereda motsvarande Review-steg. Document Health använder medvetet inga poäng
eller procentsatser. Se
[Documentation Intelligence 4.5](docs/DOCUMENTATION_INTELLIGENCE_4.5.md).

## Document Workspace 4.5 UX3

UX3 kopplar samman arbetsytorna genom ett immutable **Workspace Context**.
Markerat Review-steg, skärmbild eller annotering följer med till motsvarande
dokumentposition. Steg, instruktioner, skärmbilder, kommentarer och avsnitt i
Document Workspace kan aktiveras med mus eller tangentbord för att direkt hitta
rätt redigeringssteg i Review Workspace. Synkronisering använder stabila ID:n,
varsam markering och rörelse som respekterar reducerad motion.

UX2 gör Document Workspace till en adaptiv läsmiljö för långa dokument. Ett
tillgängligt dokumentverktygsfält erbjuder anpassa bredd, anpassa sida, 100 %,
zoom in/ut, kontinuerligt läge, sidläge och sidnavigering. Home, End, Page Up,
Page Down och Ctrl-baserade zoomkommandon fungerar direkt i dokumentarbetsytan.

Zoom, visningsläge, adaptiv läspreferens och verktygsfältslayout sparas lokalt
som vypreferenser och blir aldrig del av Review-data. Adaptiv läsning väljer
automatiskt lugn bakgrund, centrering, separation och sidelevation utifrån
arbetsytans storlek, zoom och visningsläge. Avancerade vyinställningar erbjuder
Auto, Alltid på och Alltid av utan att göra valet till en vardagsinställning.

Documentation Excellence har nu två samordnade förstaklassarbetsytor:
**Review Workspace** för ändringar och **Document Workspace** för skrivskyddad
läsning och verifiering. Växlingen sker direkt i samma vy utan sidladdning eller
ytterligare dialog.

Document Workspace använder exakt samma produktionskedja som Word-exporten:
Review Projector, Semantic Document, upplöst tema, Document Planner och Document
Plan. Den renderer-neutrala workspace-modellen läser aldrig Review. Dashboarden
förbereder samma skärmbildsmedia som Word, inklusive icke-destruktiva
annoteringar.

Ändringar från redigering, annotering, flytt, merge, split, delete och Undo/Redo
invaliderar dokumentvyn automatiskt. Stabilt identifierade avsnitt återanvänds
när innehållet inte förändrats. Se
[Document Workspace 4.5](docs/DOCUMENT_WORKSPACE_4.5.md).

Documentation Excellence v4.5.0 är produktionsklar. Inspelning, Granskning,
icke-destruktiva annoteringar, dokumentkvalitetsanalys, professionell planering
och Word-export fungerar som ett sammanhängande dokumentationsflöde. Se
[Release Notes 4.5.0](docs/RELEASE_NOTES_4.5.0.md),
[Production Readiness 4.5](docs/PRODUCTION_READINESS_4.5.md) och
[Ship Review 4.5](docs/SHIP_REVIEW_4.5.md).

## Documentation Excellence 4.4 RC1

RC1 introducerar en fristående, semantisk dokumentmodell mellan Review-data och
framtida dokumentrenderare. Modellen beskriver innehåll, struktur, källreferenser
och generiska resurser utan Word-, PDF-, sid- eller typografispecifika värden.

Modellen är versionshanterad, serialiserbar och rekursivt immutabel. Stabilt
identifierade dokument, sektioner, block och resurser kan normaliseras och
valideras utan att indata ändras. Okända framtida egenskaper och välformade
blocktyper bevaras vid normalisering och omladdning.

RC1 etablerade arkitekturgrunden; RC2-projektorn nedan producerar nu modellen.
Sedan RC5 använder Word-exporten hela den nya dokumentkedjan. Se
[Semantic Document Model 4.4](docs/SEMANTIC_DOCUMENT_MODEL_4.4.md).

### RC2 — Review-projektion

`review-document-projector` är nu den enda produktionskomponenten som skapar
semantiska dokument från Review. Den rena projektionen omvandlar metadata, steg,
kommentarer, skärmbildsreferenser, annoteringsreferenser och revisionshistorik
till frysta semantiska sektioner, block och generiska bildresurser.

Projektorn genererar stabila ID:n och deterministisk provenance från Reviewns
egna tidsstämplar. Kvalitetsproblem som saknad titel, metadata, instruktion eller
skärmbild rapporteras separat som skrivskyddad diagnostik och bäddas inte in i
dokumentet. Inga bildbytes laddas och Review-data ändras aldrig.

Word-exporten använder sedan RC5 projektorns semantiska dokument via ett
upplöst paritetstema och Document Planner.

### RC3 — Document Theme System

Ett fristående, versionshanterat temasystem definierar nu värden för färger,
typografi, mellanrum, sida, branding och semantiska komponenter. Teman är
rekursivt immutable, serialiserbara och oberoende av Review, dokumentinnehåll,
layoutmotorer och renderare.

Temaregistret innehåller **Thinknine**, **Minimal** och **Corporate** samt ett
komplett bastema. Saknade värden ärvs i kedjan bastema → valt tema → explicita
overrides. Tokenreferenser löses först efter arv, så exempelvis en ändrad
primärfärg används konsekvent av rubriker och komponenter.

Kapabiliteter beskriver vad ett tema har värden för men aktiverar eller stänger
aldrig av funktioner. RC3 introducerade ingen UI-väljare eller exportkoppling;
sedan RC5 används det upplösta Thinknine-temat i Word-produktionsflödet.

### RC4 — Document Planner

Document Planner är nu den enda komponenten som producerar renderer-neutrala
Document Plans. Planeraren kombinerar ett Semantic Document med ett upplöst
tema och beskriver sektioner, komponenthierarki, dokumentflöde, gruppering,
placering, prioritet, synlighet samt page- och spacing-intent.

Tema-kapabiliteter påverkar planeringen: exempelvis planeras header, footer,
cover, callouts, revisionshistorik och TOC endast som synliga när temat beskriver
stöd. Kapabiliteter skapar aldrig rendering. Planens källreferenser pekar tillbaka
på semantiska sektioner, block och assets utan att kopiera innehållet.

Temamodellen skiljer nu `themeSchemaVersion` från det enskilda temats `version`
och stödjer immutable `origin` samt kompatibilitetsdeklarationer för Semantic
Document och Planner. Äldre teman får säkra wildcard-standarder utan migrering.

Word-adaptern använder sedan RC5 planen som sin enda dokumentkälla.

### RC5 — Word Adapter Migration

Den aktiva Word-exporten går nu genom `Review → projektor → Semantic Document →
Thinknine-paritetstema → Document Planner → Document Plan → Word-adapter`.
Adaptern tar endast emot den validerade planen och förberedda bildresurser. Den
läser inte Review, steg, historik, annoteringsdata eller temaregistret.

Dokumentets synliga layout är avsiktligt oförändrad: försättssida, metadata,
rubriker, steg, kommentarer, skärmbilder med annoteringar, sidhuvud, sidfot och
versionshistorik behåller tidigare struktur och utseende. Review-persistence,
filnamn och skärmbildslagring är också oförändrade. Se
[Word Export Architecture 4.4](docs/WORD_EXPORT_ARCHITECTURE_4.4.md).

### RC6 — Återanvändbara dokumentkomponenter

Document Planner skapar nu explicita, renderer-neutrala komponentkontrakt för
försättssida, sidhuvud, sidfot, metadata, workflow, steg, skärmbilder, callouts,
versionshistorik, innehållsförteckning och sidbrytningar. Varje instans har ett
stabilt ID, semantiskt innehåll, källreferenser, tillgänglighetsmetadata,
presentationsintention, temareferenser och eventuella kapabilitetskrav.

Ett immutable register är enda källan för inbyggda komponentdefinitioner och kan
utökas med framtida komponenttyper. Valideringen kontrollerar kontrakten utan att
kassera okända framtida typer eller fält. Word-adaptern renderar fortsatt endast
Document Plan och synlig Word-output är oförändrad.

### RC7 — Dokumentkvalitetsdiagnostik

Före Word-rendering analyseras Semantic Document och Document Plan av ett
fristående, renderer-neutralt kvalitetslager. Findings har stabila ID:n,
severity, meddelande, specifik källreferens, plats, detaljer och föreslagen
åtgärd. En sammanfattning visar antal per severity och regel samt berörda
sektioner och steg.

Reglerna kontrollerar dokumentstruktur, steginstruktioner, skärmbilder,
annoteringsreferenser, callouts, metadata och planens konsistens. Analysen är
deterministisk, immutable, härledd och blockerar aldrig export. RC7 visar ingen
ny stor UI; resultatet finns programmässigt som `qualityDiagnostics` i
Word-pipelinen. Se [Document Quality 4.4](docs/DOCUMENT_QUALITY_4.4.md).

### RC8 — Smart Presentation och professionell layout

Word-dokumenten använder nu Document Plan fullt ut för en tydligare visuell
hierarki, balanserad försättssida, kompakt metadata, konsekventa stegband,
rollstyrda callouts, större skärmbilder och bättre sektionsflöde. Allt
presentationsbeslut fattas av Planner utifrån temats tokens; Word-adaptern
översätter bara den färdiga planen till DOCX.

Review och Semantic Document är oförändrade, så innehållet är detsamma och inga
migreringar krävs. Se [Presentation Planning 4.4](docs/PRESENTATION_PLANNING_4.4.md)
och den [visuella RC7/RC8-jämförelsen](docs/RC8_VISUAL_COMPARISON.md).

### RC9 — Release Hardening

RC9 verifierar hela konsultflödet, arkitekturlagren, tillgängligheten,
prestandan och regressionstäckningen utan att lägga till nya produktfunktioner.
Statusåterkoppling har härdats för skärmläsare, oförändrad popupstatus orsakar
inte längre onödiga DOM-uppdateringar och överflödiga releaseartefakter har
tagits bort. Alla v4.2-, v4.3- och v4.4-regressioner ingår i releasegrinden.

## Screenshot annotations 4.3 RC1

Review-modellen har en ny, versionshanterad grund för icke-destruktiva
skärmbildsannoteringar. Rektanglar och pilar använder stabila ID:n och
normaliserade koordinater mellan 0 och 1. Originalbilder ändras aldrig, och
äldre Reviews utan annotationsdata fortsätter att fungera.

RC1 innehåller endast domänmodell, validering och migreringsstöd. Den synliga
SVG-editorn och annoteringar i Word-exporten tillkommer i senare RC-steg. Se
[Screenshot Annotations 4.3](docs/SCREENSHOT_ANNOTATIONS_4.3.md).

### RC2 — SVG-editor

Varje skärmbild i Review Studio har nu valet **Annotera**. Editorn ritar röda
rektanglar som ett separat SVG-lager över originalbilden. Dra på bilden med mus
eller pekdon, eller tryck Enter på ritytan för en tangentbordsstyrd centrerad
rektangel. Escape avbryter en pågående ritgest.

Annoteringarna visas även över skärmbilden i stegkortet. De sparas tillsammans
med Review-data när **Spara** används; originalskärmbilden förändras aldrig.
Undo/Redo, automatisk sparning och Word-rendering ingår i senare RC-steg.

### RC3 — Pilar och professionell interaktion

Annotationseditorn stöder nu både **Rektangel** och **Pil**. Befintliga
markeringar kan väljas direkt på bilden eller i den tillgängliga listan. Dra en
vald markering för att flytta den, använd piltangenterna för pixelsteg eller
Shift+piltangent för tio pixelsteg.

Egenskapsfält i procent ger exakt flytt och storleksändring av rektanglar samt
redigering av pilarnas start- och slutpunkter. Delete eller knappen **Ta bort
markering** raderar den valda markeringen. Ändringarna sparas med Reviewns
befintliga manuella Spara-kommando. Undo/Redo och autosave kopplas in i RC4.

### RC4 — Undo/Redo och säker persistence

Alla bekräftade annotationsändringar använder nu Review Studios befintliga
Undo/Redo-historik. Det omfattar tillägg, flytt, storleksändring, piländpunkter,
stil och borttagning. En komplett pekargest skapar en historikpost och upprepade
tangentbordsförflyttningar grupperas när de följer direkt på varandra.

Annoteringar autosparas efter en kort fördröjning. Pågående ritning eller drag
sparas aldrig som delgeometri. Sparningar serialiseras och äldre svar kan inte
skriva över nyare Review-data. Väntande persistence flushas före **Klar**,
manuell **Spara** och Word-export.

**Avbryt** i annotationseditorn återställer annoteringarna och deras historik
till läget när editorn öppnades, utan att skriva över stegändringar som gjorts
utanför editorn. **Klar** behåller och sparar sessionens ändringar.
Originalskärmbilden förändras fortfarande aldrig.

### RC5 — Annoteringar i Word

Word-exporten visar nu rektanglar och pilar ovanpå respektive skärmbild. Vid
export skapas en tillfällig PNG i skärmbildens originalupplösning från samma
annotationsscen som används i Review Studio. Review-data, annoteringar och den
lagrade originalbilden förändras inte.

Varje använd skärmbild komponeras högst en gång per export. Skärmbilder utan
stödda annoteringar exporteras byte-identiskt enligt den tidigare vägen, och
okända framtida annotationstyper ignoreras utan att stoppa exporten.

### RC6 — Release hardening

Den slutliga kvalitetsgranskningen har förstärkt tangentbordsfokus, Escape-
beteende, historikskydd i annotationsläget och felhantering vid export. Ogiltiga
framtida annotationsstilar renderas med säkra standardvärden utan att lagrad
data ändras. Bildresurser och canvasminne frigörs även på felvägar.

Review-huvudet samt annotationseditorns titel, **Avbryt**, **Klar** och verktyg
ligger kvar tillsammans högst upp när användaren scrollar genom en lång
skärmbild.

## Struktur

```text
src/
├── recorder/
├── engine/
│   ├── noise-filter.js
│   ├── entity-memory.js
│   ├── session-graph.js
│   ├── confidence-engine.js
│   └── documentation-engine.js
├── review/
├── exporters/
├── ui/
└── knowledge-packs/

dist/                 Laddas som opaketerat Edge-tillägg
scripts/build.js
tests/engine.test.js
```

## Kommandon

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run check
```

## Edge-installation

Öppna `edge://extensions`, välj **Läs in opaketerat** och välj mappen `dist`.

## Nya exportfiler

- `session-graph.json`
- `confidence-report.json`

Session Graph grupperar uppgifter per affärsentitet. Confidence Report visar sessionskvalitet, Knowledge Pack-träff och grafens täckning.

## GitHub-arbetsflöde

Varje push eller pull request mot `main` kör:

```text
lint → tester → build → syntaxkontroll
```

Skapa en release genom att tagga en version:

```powershell
git tag v4.2.0-rc
git push origin v4.2.0-rc
```

GitHub Actions bygger då automatiskt en Edge-ZIP och bifogar den till en GitHub Release.


## Review Studio 3.6

Öppna en avslutad session och välj **Granska**.

Review Studio stöder:

- redigering av instruktioner
- kommentarer
- godkännande per steg
- ändrad ordning
- manuella steg
- borttagning av steg
- skärmbildsförhandsvisning
- lokal lagring per session

Den sparade modellen används direkt av Word-exportören.


## Fast Edge development folder

Edge ska alltid läsa det opaketerade tillägget från:

```text
C:\Development\Thinknine-BC-Process-Intelligence\dist
```

Kör inför varje omladdning:

```powershell
npm.cmd run build
```

Byggskriptet synkar `dist` från `src` och sätter versionsnumret i `manifest.json` från `package.json`.

Windows-hjälpskript:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-and-open.ps1
```


## Synlig granskning

Välj **Öppna Dokumentbibliotek** i popupfönstret. I **Dokumentbiblioteket** finns
tidigare sparad dokumentation.
Råsessioner och ZIP-export finns under **Inspelningar och tekniska verktyg**.

Välj **Öppna dokumentation** för att granska ett dokument.


## Word Generator 3.7

Öppna en session i **Review Studio** och välj **Exportera Word**.

Dokumentet innehåller:

- försättssida
- dokumentmetadata
- innehållsförteckningsfält
- syfte
- förutsättningar
- granskade arbetssteg
- skärmbilder
- kommentarer
- förväntat resultat
- versionshistorik
- sidhuvud och sidnummer

Word-exporten arbetar mot den sparade granskningsmodellen. Råhändelser används inte direkt i dokumentet.


## Hotfix 3.7.1

Version 3.7.1 återställer dashboardens uppstart och dataladdning.

Inställningar läses nu med standardvärden som fallback och sessionlistan
renderas även när lagringen är tom eller ett äldre lagringsformat används.


## Word Generator 4.0

Word-exporten använder nu biblioteket `docx` i stället för handskriven OpenXML.

Installera beroenden efter att patchen packats upp:

```powershell
npm.cmd install
npm.cmd run ci
npm.cmd run build
```

Byggskriptet paketerar `docx` och Word-exportören till:

```text
dist/exporters/word-exporter-docx.bundle.js
```

Edge laddar endast den färdiga bundlen. Inga externa CDN-anrop görs när tillägget används.


## Exportinställningar 4.1.1

Filnamnsmallen har direkt förhandsvisning och variabelknappar som infogar en
variabel vid markörens aktuella position. Okända och felaktigt skrivna variabler
markeras med tydliga valideringsmeddelanden utan att blockera exporten.
Befintliga mallar fortsätter att fungera.

De variabler som stöds genereras och visas i dashboarden. Samma centrala
definition används för knappar, hjälptext, validering och filnamnsgenerering.

Exempel:

```text
{process} - {environment} - {date}
```

Exporter sparas via Edge Downloads med automatiskt unika filnamn vid konflikt.

Variabler för företag och användare exponeras inte eftersom inspelade sessioner
ännu inte innehåller tillförlitliga värden för dessa uppgifter.

Variabelgruppen kan användas med Tab, Shift+Tab, piltangenter, Home och End.
Preview och valideringsfel meddelas även till skärmläsare.

Se [Release Notes 4.1.1](docs/RELEASE_NOTES_4.1.1.md) för en fullständig
sammanställning av ändringarna.


## Review Studio 4.2 Release Candidate

4.2 samlar Review Studio kring små, återanvändbara moduler för selection, Move,
Merge, Split, Undo/Redo, inline-redigering, toolbar-state, dokumentstatus och
tillgänglig dialoghantering. Domänoperationerna arbetar mot stabila task-ID:n;
dashboarden ansvarar för rendering, persistence och exportintegration.

Release Candidate innehåller:

- enkel-, intervall- och multiselection med mus och tangentbord
- drag-and-drop och tangentbordsstyrd omordning
- Merge, Split och borttagning direkt på varje steg
- Undo/Redo för Move, Merge, Split, Delete och Edit
- inline-redigering med commit, cancel och autosave
- selection-driven toolbar och live statusrad
- modal dialog, fokusfälla, ARIA-grid och skärmläsarstöd
- Word-export med bevarad ordning, metadata och samtliga skärmbilder

Se [Release Notes 4.2.0](docs/RELEASE_NOTES_4.2.0.md) och
[Review Studio Architecture 4.2](docs/REVIEW_STUDIO_ARCHITECTURE_4.2.md).

### Utvecklingssteg: RC1 foundation

Review Studio har ett separat, transient urvalslager som inte ändrar eller
sparar reviewinnehållet. Klick väljer ett steg, Ctrl/Cmd+klick växlar enskilda
steg och Shift+klick väljer ett intervall.

När ett stegkort har fokus stöds:

- pil vänster/upp och höger/ned för föregående eller nästa steg
- Home och End för första eller sista steget
- Shift tillsammans med navigering för intervallmarkering
- Ctrl/Cmd+A för att välja alla steg
- Enter eller Blanksteg för att välja aktivt steg

Urvalet exponeras som ett flervals-grid för hjälpmedel. RC1 innehåller ingen
redigering av flera steg; modellen är en grund för kommande funktioner.

Se [Review Studio Architecture 4.2](docs/REVIEW_STUDIO_ARCHITECTURE_4.2.md).

### Drag & Drop RC2

Steg kan flyttas med det särskilda **Flytta**-handtaget. Om det dragna steget
ingår i ett flerval flyttas hela urvalet som ett block. Annars flyttas endast
det dragna steget och befintligt urval bevaras.

Samma move-engine används av drag-and-drop, knapparna **Flytta upp/ned** och
Alt+pil upp/ned. Fokus och selection följer stabila task-ID:n efter flytten.
Animationen stängs automatiskt av när operativsystemet föredrar reducerad
rörelse.

### Merge Steps RC3

Markera minst två steg och välj **Slå samman**. Det nya steget placeras där det
första valda steget låg och innehåller instruktioner, originaltext, kommentarer,
skärmbilder, source events och metadata från samtliga källsteg.

Efter merge markeras det sammanslagna steget och får fokus. Varje merge sparar
en history entry med källstegens fulla snapshots och ursprungliga index. Undo är
inte aktiverat i RC3, men historikformatet innehåller allt som behövs för exakt
återställning.

### Split Step RC4

Markera ett steg, placera textmarkören där instruktionen ska delas och välj
**Dela steg**. Delarna ersätter källsteget på samma plats och markeras
tillsammans efter operationen.

Varje del återanvänder källstegets skärmbilder, source events och metadata.
Split sparas i samma versionshanterade history som merge, med en komplett
snapshot av källsteget och ID:n för de skapade delarna.

Split-engine kan även ta emot färdiga textsegment med valfri metadata och en
`suggestionSource`. Detta är integrationspunkten för framtida AI-förslag; RC4
innehåller ingen AI-tjänst eller automatisk uppdelning.

### Undo / Redo RC5

Review Studio har en gemensam kommandohistorik för flytt, sammanslagning,
delning, borttagning och redigering. Använd **Ångra**/**Gör om**, Ctrl/Cmd+Z
eller Ctrl+Y. Cmd/Ctrl+Shift+Z fungerar också för Gör om.

Historiken sparas med reviewn, begränsas till 100 kommandon och behåller
selection när kommandot har ett känt urval. Varje bekräftad inline-redigering
skapar en separat Undo-post.

### Professional Editing RC6

Instruktioner och kommentarer visas inline. Dubbelklicka på ett fält eller
markera ett steg och tryck Enter för att börja redigera instruktionen. Enter
skapar en ny rad i instruktionen. Ctrl+Enter (Cmd+Enter på macOS) bekräftar,
medan Escape avbryter och återställer ursprungsvärdet.

Bekräftade ändringar sparas automatiskt efter en kort fördröjning. Flera snabba
ändringar samlas till en save-operation, medan knapparna för manuell sparning
finns kvar. Native Undo/Redo i textfältet prioriteras under pågående redigering;
Review Studios kommandohistorik tar över när redigeringen har bekräftats.

### Professional Toolbar RC7

Review Studios primära toolbar samlar Ångra, Gör om, Slå samman, Dela,
Flytta upp, Flytta ned och Exportera Word i funktionella grupper. Knapparnas
tillstånd beräknas automatiskt från aktuellt urval, stegens position,
kommandohistoriken och exportberedskapen.

Move och strukturkommandon arbetar på hela urvalet. Flyttknapparna stängs av vid
dokumentets respektive gräns. Varje steg har en egen **Ta bort**-knapp och
borttagningen kan ångras. Toolbaren kan navigeras med Tab samt
vänster/högerpil, Home och End; disabled kommandon hoppas över.

Välj **Komprimera alla** för att tillfälligt dölja kommentarer, metadata och
skärmbilder och göra långa reviews enklare att överblicka och ordna. Varje steg
har dessutom en egen **Komprimera**/**Expandera**-knapp. Knapptexten visar alltid
nästa åtgärd utifrån stegets aktuella läge. Visningsläget ändrar inte sparad
reviewdata eller export.

Varje steg godkänns individuellt med **Godkänd**. När samtliga aktiva steg är
godkända aktiveras **Slutför granskning**. Det tidigare snabbkommandot
**Godkänn alla** har tagits bort för att slutstatusen ska representera en
faktisk genomgång av varje steg.

Instruktionen redigeras med den synliga **Redigera**-knappen. Kommentar är ett
valfritt komplement för exempelvis undantag, kontroller eller kundspecifika
anvisningar och läggs till med **Lägg till kommentar**. Befintliga kommentarer
har en egen **Redigera**-knapp och följer med i Word-exporten. Enter sparar och
Escape avbryter redigeringen.

### Status Bar RC8

Statusraden visar antal aktiva steg, valda steg, uppskattade dokumentsidor och
antal skärmbilder. Den uppdateras direkt vid selection, Move, Merge, Split,
Delete, Add samt Undo/Redo.

Sidantalet är en planeringsuppskattning: dokumentets försättsdel räknas först,
varefter stegtext och skärmbilder vägs in. Skärmbilder dedupliceras inom varje
steg enligt samma princip som Word-exporten, men en bild som används av flera
steg räknas vid varje placering eftersom den också renderas flera gånger.

Statusvärdena är en semantisk definitionslista i en atomisk, polite live-region.
Review-gridens `aria-describedby` refererar samma status, så aktuella värden är
tillgängliga även utan visuell avläsning.

### Accessibility Review RC9

Review Studio exponeras som en namngiven modal dialog. Fokus flyttas till
dialogen när den öppnas, hålls inom dialogen med Tab/Shift+Tab och återgår till
kontrollen som öppnade den när dialogen stängs. Escape stänger dialogen, men
fortsätter att avbryta inline-redigering utan att samtidigt stänga Review Studio.

Review-grid innehåller dynamiska radantal och radindex. Instruktions- och
kommentarsfält har programmatiskt kopplade labels, kontextknappar annonserar
aktuellt steg och granskningsförloppet exponeras som en progressbar med aktuellt
procentvärde. En visuellt dold hjälptext beskriver selection, redigering och
tangentbordsflyttning för skärmläsare.

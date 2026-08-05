# Thinknine BC Process Intelligence v4.3.0 Release Candidate

Ett modulärt Edge-tillägg för att spela in, granska och exportera dokumenterade
Business Central-processer.

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


## Synlig Review Studio

På sidan **Sessioner och export** visas nu knappen **Granska** för avslutade sessioner.

Klicka **Granska** för att öppna Review Studio och kontrollera att gränssnittet fungerar innan fler funktioner läggs till.


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
bekräftar, Escape avbryter och återställer ursprungsvärdet. Använd Shift+Enter
för en ny rad i instruktionen.

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

# Framtida funktioner

Utvecklingsförslag som är sparade för senare. Varje förslag beskriver vad användaren ska kunna göra, varför och vad som redan finns att bygga på. Ett förslag är inte ett beslut. När det genomförs flyttas det till CHANGELOG och tas bort här.

## Översikt över körda tester

*Sparat 2026-11-13. Förslag, inte beslut.*

### Vad användaren ska kunna

Svara snabbt på tre frågor utan att öppna test för test:

1. **Hur ser det ut just nu?** Vilka processer är testade, vilka underkändes och vilka har aldrig testats eller testades för länge sedan?
2. **Hur har den här processen gått över tid?** Alla körningar av en process med resultat, miljö, version, testare och vad som ändrades sedan förra gången.
3. **Vad hände i den här testomgången jämfört med förra?** Nya fel, lagade fel och oförändrade, till exempel före och efter en Business Central-uppgradering.

Förslaget är båda vyerna: en samlad översikt och en historik per process. De bygger på samma data och länkar till varandra. Testsviter är en del av båda, inte en separat värld.

### Vad som finns att bygga på

- Varje körning sparas för sig (`t9_test_run_<id>`) med dokument (`sessionId`), stegens resultat, testare, miljö, datum och eventuell svit (`suiteId`). `T9TestScript.summary(run)` ger utfall och antal per resultat.
- En svit (`t9_test_suite_<id>`) har miljö, version och `previousSuiteId`, alltså en kedja av omgångar. `progress` räknar fram sviten från körningarna.
- Testsidan visar redan "Tidigare körningar av testet" för ett dokument. Testprotokollet finns för en körning och för en svit.
- Steg som fick sitt resultat från inspelningen är märkta (`resultSource: "recording"`). Felrapporter skapade från ett steg är länkade.

Ingen ny lagring behövs för en första version. Allt räknas fram ur körningar och sviter. Ett lättviktigt testindex, motsvarande dokumentindexet, kan läggas till om det blir långsamt med många körningar.

### Design

#### 1. Testöversikt (ny flik i Dokument)

En flik **Tester** bredvid dokumentlistan, eller ett snabbfilter med samma placering som "Behöver granskas". Fliken visar en rad per process som har ett test eller borde ha ett.

```
Tester                                         [Exportera CSV]  [Skapa testsvit]
Sök…            Miljö: Alla ▾   Version: Alla ▾   Period: 90 dagar ▾   Svit: Alla ▾
[Alla 18] [Underkända 2] [Pågår 1] [Godkända 12] [Aldrig testade 3] [Äldre än 90 dagar 4]

Process                     Senaste resultat     När         Miljö / version     Trend
Inköpsorder Testkörning     ● Underkänd 2 av 9   12 nov      UAT · 27.1          ●●○●●
Stänga Prod Order           ✓ Godkänd            12 nov      UAT · 27.1          ●●●●●
Förfallodatum PS Test       ◐ Pågår 4 av 7       idag        UAT · 27.1          ●●◐
FO PS Test                  – Aldrig testad                                       [Kör test]
```

- **Senaste resultat** är den senaste körningen av processen: Underkänd (antal steg), Pågår (steg kvar) eller Godkänd. En godkänd körning med steg som bara inspelningen satte märks "delvis från inspelning", så att den inte ser mer verifierad ut än den är.
- **Trend** visar de senaste fem körningarna som punkter, äldst till vänster. Hovra eller fokusera för datum och resultat. Klick öppnar processens historik (vy 2).
- **Snabbfiltren** svarar på fråga 1 direkt. "Aldrig testade" och "Äldre än …" tar upp dokument utan körning, så att luckor syns.
- **Radklick** fungerar som i dokumentlistan. Markerade rader kan bli en ny testsvit, så översikten är också vägen in till sviter.
- **Tomläge:** "Inga tester har körts än. Välj Kör test i ett dokuments meny, eller markera flera dokument och skapa en testsvit." Med filter: "Inga tester matchar filtren" och Återställ filter.
- **Exportera CSV** ger en rad per process med senaste resultat, datum, miljö, version och testare. Filen rapporteras som sparad först när webbläsaren har sparat den.

*Byggt 2026-11-15: vyn Tester med snabbfilter (Underkända, Pågår, Godkända, Aldrig testade, Äldre än 90 dagar), sökning, trend, Historik/Kör test och CSV. Rullistorna Miljö, Version, Period och Svit byggda samma dag, i en Filter-ruta. Inte byggt än: markering av rader för att skapa en testsvit, och sviterna ovanför listan.*

Ovanför listan visas sviterna kompakt, som i dag men med resultat:

```
Testsviter
Uppgradering 27.1 (UAT)   ● 2 underkända · 14 av 16 klara · jämfört med 26.5: 1 nytt fel, 2 lagade   [Öppna]
```

#### 2. Historik per process

Två ställen, samma innehåll:

- **I dokumentlistan** får varje dokumentation en liten testmarkering på raden, bredvid "Mall: …": ✓ Testad 12 nov / ● Underkänd 12 nov / – Ej testad. Klick öppnar historiken.
- **I dokumentet** (granskningsvyn) finns en sektion **Tester** med en tidslinje. Testsidans nuvarande "Tidigare körningar av testet" ersätts av samma komponent.

```
Tester för Inköpsorder Testkörning                         [Kör test]  [Kör igen]
● 12 nov  Underkänd 2 av 9   UAT · 27.1   Anna    Svit: Uppgradering 27.1   [Öppna] [Protokoll]
     Steg 4 "Bokför" – nytt fel sedan förra körningen  → Felrapport BR-12
     Steg 7 "Skriv ut" – underkänd även förra gången
✓ 3 okt   Godkänd 9 av 9     UAT · 26.5   Anna    Svit: Uppgradering 26.5   [Öppna] [Protokoll]
✓ 2 sep   Godkänd 9 av 9     PROD · 26.5  Erik                              [Öppna] [Protokoll]
```

- Varje körning visar utfall, miljö, version, testare, svit och länkar till körningen och protokollet.
- **Jämförelse med förra körningen** visas direkt under en underkänd körning: vilka steg som är nya fel och vilka som var underkända även förra gången. Stegen paras med stegets stabila id eller signatur, inte position, så att jämförelsen håller när dokumentet ändrats. Ett steg som saknas i den ena körningen sägs vara nytt eller borttaget, inte underkänt.
- Länkade felrapporter visas på steget.
- Pågående körning ligger överst med "Fortsätt test".

#### 3. Testsviter i samma bild

- Svitens sida får en kolumn **Jämfört med förra omgången** (via `previousSuiteId`): Nytt fel / Lagat / Oförändrat underkänt / Oförändrat godkänt / Ny i sviten. Överst summeras det: "1 nytt fel, 2 lagade, 13 oförändrade."
- Svitprotokollet får samma jämförelse i översikten, eftersom det är det man visar efter en uppgradering.
- Från en process i sviten leder **Historik** till vy 2. Från vy 2 leder svitnamnet till sviten.
- *Byggt 2026-11-15: jämförelsen på svitens sida och i svitprotokollet, med stegen som fått nytt fel. Testsvit-länken från historiken fanns redan. Kvar: en Historik-länk från en process i sviten till vy 2.*

### Principer

- **Sanningsenligt:** ett godkänt test betyder att testaren eller inspelningen godkände stegen. Det är inget bevis för att hela processen fungerar i alla lägen. Resultat som inspelningen satte märks alltid. Ingen körning räknas som godkänd så länge steg saknar resultat.
- **Inget skickas ut:** allt räknas fram lokalt, som testerna i dag. Statistik eller synk av körningar utanför webbläsaren vore ett separat beslut med samtycke.
- **Alla språk:** etiketter, filter, tomlägen, jämförelsetexter och CSV-rubriker finns på alla registrerade språk. Steg- och processnamn visas som de skrevs.
- **Smal vy:** i 420 px blir översikten kort per process (namn, resultat, datum), och trend och miljö hamnar på en andra rad.

### Tester för ett helt företag (delad mapp)

*Tillagt 2026-11-14.*

I dag delar synkmappen (`library-sync.js`) dokument och mallar mellan datorer, men inte testkörningar och testsviter. De stannar i webbläsaren där de kördes. Utan ändring visar översikten bara de egna körningarna och svarar inte på hur det ser ut för hela företaget.

Förslag: tester följer med i samma delade mapp som biblioteket.

- **Körningar** blir en fil per körning, skriven av datorn som körde den och aldrig ändrad efteråt, precis som dokumentversionerna. Två datorer skriver aldrig samma fil, så synktjänsten får inga konflikter. En pågående körning delas med en markering att den pågår och ersätts av en ny fil när den är klar.
- **Sviter** ändras av flera personer, men deras framsteg räknas redan fram ur körningarna. Själva sviten (namn, miljö, version, processer, `previousSuiteId`) ändras sällan. Ändras den på två datorer samtidigt avgör användaren, som för dokument.
- **Översikten** räknas fram ur alla körningar i mappen. Saknas dokumentet på den här datorn visas processnamnet från körningen, och Kör test erbjuds först när dokumentet finns.
- **Testaren** behöver vara densamma på alla datorer för att filtret på testare ska fungera, till exempel ett namn som sätts en gång i inställningarna och föreslås vid varje körning.
- **Fördröjning:** andras körningar syns först när synktjänsten har fört över filerna. Översikten visar när mappen senast lästes ("Uppdaterad 10:42") och kan läsas om.
- **En mapp per sammanhang:** ett företag som testar sin egen Business Central har en mapp. En konsultfirma har en mapp per kund, så att kundens dokument, tester och sviter hålls ihop och behörigheten styrs av vem som har tillgång till mappen.
- **Inget nytt skickas ut:** körningar kan innehålla värden och skärmbilder från Business Central. De stannar i företagets egen lagring under dess behörigheter. En central server (till exempel bredvid licenstjänsten) skulle ge en gemensam bild utan fördröjning, men är ny dataöverföring som kräver samtycke, uppdaterad integritetstext och drift. Det är ett separat beslut.
- **Uppgradering:** körningar som redan finns på en dator läggs i mappen när datorn ansluts, med sina id, så att inget dubbelräknas om de redan finns där.

### Föreslagen ordning

1. Testmarkering på dokumentraden och historiken per process, med jämförelse mot förra körningen. Den minsta ändringen och direkt nytta. *Byggt 2026-11-13 (se CHANGELOG): markeringen, historiken i en dialog från markeringen och på testsidan. Sektionen Tester i granskningsvyn byggd 2026-11-15: hopfälld rad under mallen med senaste resultatet, öppnas till samma tidslinje, Kör test eller Fortsätt test.*
2. Jämförelse mot förra omgången på svitens sida och i svitprotokollet.
3. Testöversikten med filter, luckor ("aldrig testade", "äldre än") och CSV-export.
4. Testkörningar och sviter i den delade mappen, så att översikten gäller hela företaget. Kan byggas före steg 3 om översikten ska användas av flera från början.

### Öppna frågor

- Ska "senaste resultat" gälla per miljö, så att PROD och UAT visas var för sig, eller bara den senaste körningen oavsett miljö? Förslag: senaste oavsett miljö, med miljöfilter.
- Vilken gräns ska "äldre än" ha som standard: 90 dagar, eller sedan senaste versionsbytet?
- Ska en processversion (ny inspelning av samma process) dela historik med den gamla eller börja om?
- Ska testkörningar delas automatiskt när biblioteket synkas, eller vara ett eget val vid anslutning av mappen? Förslag: automatiskt, med en rad om det i anslutningsdialogen.

## Kort sammanfattning med en rad per steg

*Sparat 2026-11-15. Förslag, inte beslut. Idé från jämförelsen med Worksnip (deras läge "Beat").*

### Vad användaren ska kunna

Se hela processen som en kort lista med en mening per steg, utan skärmbilder och förklaringar. Exempel för en inköpsorder:

1. Öppna sidan Inköpsorder och välj Ny.
2. Ange leverantör 10000.
3. Ange artikel 30043 på raden, antal 5.
4. Välj Släpp.
5. Välj Bokför › Inleverera.

### Varför

Dagens dokument passar den som ska lära sig processen, men är tunga för den som redan kan den och bara behöver ordningen. Sammanfattningen fungerar som snabbreferens, som översikt överst i Word-dokumentet, som checklista vid test och för att klistra in i ett mejl eller ett chattmeddelande.

### Vad som finns att bygga på

- Stegtexterna finns redan i alla registrerade dokumentspråk och skrivs om när dokumentspråket byts. Sammanfattningen visar bara dem, så inget nytt hittas på och egna ändrade stegtexter följer med som de är.
- Dolda steg i dokumentet är dolda även här.
- Dokumentmallarna väljer redan vilka avsnitt som visas (`document-template`), så sammanfattningen kan bli ett avsnitt att slå på.

### Möjlig utformning

- Ett avsnitt **Kort sammanfattning** i dokumentmallen, av som standard, som visas efter syftet i Word, PDF och förhandsvisningen.
- **Kopiera sammanfattning** i dokumentets ⋯-meny, som lägger listan som text i urklipp.

### Öppna frågor

- Ska sammanfattningen visa delrubrikerna (avsnitt och deluppgifter) eller bara en platt numrerad lista?
- Ska informationssteg och anteckningar tas med?

## Dela ett dokument som en länk som bara går att läsa

*Sparat 2026-11-15. Förslag, inte beslut. Idé från jämförelsen med Worksnip.*

### Vad användaren ska kunna

Skicka en adress i stället för en fil. Mottagaren klickar och läser dokumentet i webbläsaren, med steg, skärmbilder och markeringar, utan tillägget, licens eller Business Central. Mottagaren kan inte ändra något. När dokumentet uppdateras ser alla med länken den nya versionen, och avsändaren kan stänga av länken.

### Varför

Så sprids processdokumentation i praktiken, till kollegor, nyanställda, kunder och revisorer. I dag får mottagaren en kopia av Word- eller PDF-filen, som blir inaktuell när dokumentet ändras, och ingen vet vilken version som gäller.

### Haken

Allt ligger i dag lokalt i användarens webbläsare, och det är en styrka. En länk kräver att dokumentet lagras där andra kommer åt det. Det är ny dataöverföring: dokument kan innehålla värden och skärmbilder från Business Central.

### Tre vägar

1. **I kundens egen Microsoft 365 (SharePoint eller OneDrive). Rekommenderas.** Dokumentet läggs som en läsbar webbsida i kundens eget utrymme, och behörigheten styrs av kundens vanliga delning. Inget hamnar hos oss. Passar BC-kunder, som nästan alltid har Microsoft 365, och kan bygga vidare på den Microsoft-inloggning som licensen redan använder. Kräver behörighet till Microsoft Graph, som användaren godkänner.
2. **En fristående HTML-fil.** Allt i en fil som öppnas i vilken webbläsare som helst. Ingen server och enkelt att bygga, men i praktiken ett nytt filformat: ingen äkta länk och ingen automatisk uppdatering. Kan vara ett första steg, och samma sida kan senare läggas i SharePoint i väg 1.
3. **Lagring hos oss i molnet (som Worksnip).** Enklast för användaren, men vi blir ansvariga för kunddata. Kräver samtycke, personuppgiftsbiträdesavtal, ny integritetstext (även i Edge Store), drift och säkerhetsarbete. Bryter mot den lokala profilen och är ett separat beslut.

### Principer

- Inget delas utan att användaren uttryckligen väljer det för det dokumentet, och dialogen säger var dokumentet hamnar och vem som kan se det.
- Maskerade värden förblir maskerade i den delade versionen. Typade värden för Page Scripting följer aldrig med.
- Användaren ser vilka dokument som är delade och kan sluta dela.

### Öppna frågor

- Ska en delad länk uppdateras automatiskt när dokumentet sparas, eller först när användaren väljer Uppdatera delning?
- Ska den delade sidan följa dokumentets mall (logga, färg) och dokumentspråk?

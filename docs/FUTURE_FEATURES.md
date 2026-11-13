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

### Principer

- **Sanningsenligt:** ett godkänt test betyder att testaren eller inspelningen godkände stegen. Det är inget bevis för att hela processen fungerar i alla lägen. Resultat som inspelningen satte märks alltid. Ingen körning räknas som godkänd så länge steg saknar resultat.
- **Inget skickas ut:** allt räknas fram lokalt, som testerna i dag. Statistik eller synk av körningar utanför webbläsaren vore ett separat beslut med samtycke.
- **Alla språk:** etiketter, filter, tomlägen, jämförelsetexter och CSV-rubriker finns på alla registrerade språk. Steg- och processnamn visas som de skrevs.
- **Smal vy:** i 420 px blir översikten kort per process (namn, resultat, datum), och trend och miljö hamnar på en andra rad.

### Föreslagen ordning

1. Testmarkering på dokumentraden och historiken per process, med jämförelse mot förra körningen. Den minsta ändringen och direkt nytta.
2. Jämförelse mot förra omgången på svitens sida och i svitprotokollet.
3. Testöversikten med filter, luckor ("aldrig testade", "äldre än") och CSV-export.

### Öppna frågor

- Ska "senaste resultat" gälla per miljö, så att PROD och UAT visas var för sig, eller bara den senaste körningen oavsett miljö? Förslag: senaste oavsett miljö, med miljöfilter.
- Vilken gräns ska "äldre än" ha som standard: 90 dagar, eller sedan senaste versionsbytet?
- Ska en processversion (ny inspelning av samma process) dela historik med den gamla eller börja om?

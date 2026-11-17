# Att fixa

Kända fel, brister och kontroller som behöver göras i BC Process Studio. Varje punkt beskriver vad som är fel, vad användaren märker och ett förslag. En punkt är bekräftad i koden eller i Business Central om inget annat sägs; det som bara är en misstanke står som **Att kontrollera**. När en punkt är åtgärdad flyttas den till CHANGELOG och tas bort här. Nya funktioner hör hemma i [FUTURE_FEATURES.md](FUTURE_FEATURES.md).

## Exemplets Business Central-texter på Kom igång-sidan är inte kontrollerade mot klienten

*Tillagd 2026-11-17.*

**Vad är fel:** exemplet på Kom igång-sidan (`src/ui/welcome.js`, `SAMPLE`) visar Business Central-texter som Inköpsorder, Ny, Leverantörsnr, Antal och Släpp på alla åtta språk. Svenska och engelska är kända från inspelningar. Franska, tyska, spanska, danska, finska och norska är skrivna efter bästa kännedom och inte kontrollerade mot Business Central-klientens språkresurser eller en inspelning, eftersom kunskapskatalogen saknar de här fälten på de språken.

**Vad användaren märker:** möjligen en text i exemplet som inte exakt motsvarar vad Business Central visar på användarens språk. Exemplet är märkt Exempel och påverkar inga dokument.

**Förslag:** kontrollera texterna i en Business Central-miljö per språk, eller mot klientens språkresurser, och rätta `SAMPLE`.

## Konsultregistreringens felmeddelande visas på svenska när tjänsten anger en orsak

*Tillagd 2026-11-17.*

**Vad är fel:** felmeddelandena i `src/engine/consultant-license.js` skrivs på svenska och översätts när de visas, genom paren i `src/ui/i18n.js` och `locale-catalogs.js`. Det fungerar för alla utom ett. När konsultregistreringen misslyckas och licenstjänsten skickar med en orsak blir texten `Konsultregistreringen kunde inte skapas (HTTP 500: orsak).`. Den matchar inte mallen `… (HTTP {status}).` och visas därför på svenska oavsett gränssnittsspråk. Två andra meddelanden i samma funktion vänder sig till den som driftar tjänsten och inte till användaren: "Distribuera den senaste tjänste-ZIP-filen" och "Kontrollera LICENSE_ENTRA_AUDIENCE och LICENSE_ENTRA_SCOPE i Azure".

**Vad användaren märker:** en konsult som inte har svenska som gränssnittsspråk kan få ett svenskt felmeddelande vid registreringen. Vid de två andra felen får användaren instruktioner om Azure och ZIP-filer som hen inte kan göra något åt.

**Förslag:** ge meddelandena nycklar i `i18n.js` med platshållare för status och orsak, som övriga `license.*`-texter. Skriv texterna för användaren, till exempel att licensen inte kunde registreras och att man kan försöka igen eller kontakta sin administratör. De tekniska detaljerna kan ligga kvar i diagnostiken.

## Markeringen "Viktigt steg" gör ingenting i dokumentet

*Tillagd 2026-11-16.*

**Vad är fel:** knappen Viktigt steg i den flytande inspelningsrutan sparar en markering (`guidanceKind: "important"`). Den förs vidare till stegets `important` i `session-interpretation-pipeline.js`, men ingen granskningsvy, förhandsvisning eller export läser den.

**Vad användaren märker:** man klickar på Viktigt steg och får bekräftelsen att steget markerats, men dokumentet ser likadant ut som utan markering.

**Förslag:** bestäm vad ett viktigt steg ska innebära, till exempel en framhävd ruta i dokumentet och en markering i granskningen, och visa det. Tills dess finns knappen inte i den nya inspelningspanelen, bara i den flytande rutan.

## Page Scripting-test som börjar på ett kort

*Tillagd 2026-11-13.*

**Vad är fel:** börjar inspelningen på ett kort, till exempel en öppen inköpsorder, blir testets första steg "Öppna Purchase Order". Testet spelas då upp på den post som råkar vara öppen, inte på den som spelades in. Ett test som börjar i en lista (till exempel inköpsorderlistan) är förutsägbart.

**Vad användaren märker:** testet kan ändra eller ta bort rader på fel order utan att säga till.

**Förslag:** säg till i meddelandet efter exporten när testet börjar på ett kort, och föreslå att spela in från listan. Undersök om Page Scripting kan öppna ett kort på en viss post innan exporten själv försöker göra det.

## Kontroll av Page Scripting-exporten vid varje ny Business Central-version

*Tillagd 2026-11-13. Återkommande, i april och oktober.*

**Vad är fel:** exporten läser fält-, knapp- och dialognamn ur webbklientens interna JavaScript-objekt (`al-identity-capture.js`). De är inte ett publicerat gränssnitt och kan ändras när Microsoft släpper en ny version.

**Vad användaren märker:** efter en uppdatering kan steg saknas i testet. Exporten säger då vilka steg den inte kunde namnge i stället för att gissa, men testet blir kortare.

**Förslag:** spela efter varje större uppdatering in referensflödet (inköpsorder från listan med leverantör, rader, Manuellt pris, Ta bort rad med Ja, Släpp och Öppna igen), exportera och spela upp det. Notera resultatet här.

## Menyval som inte kan namnges i radens ⋯-meny

*Tillagd 2026-11-13.*

**Vad är fel:** ett val i en rads ⋯-meny pekar inte ut någon knapp. Exporten hittar knappen på dess text, men bara om alla knappar med samma text är samma knapp. Har två olika knappar samma text kommer steget inte med.

**Vad användaren märker:** meddelandet efter exporten säger att steget saknas.

**Att kontrollera:** om det händer i verkliga sidor, till exempel med appar från andra leverantörer. Hittas ett fall kan valet knytas till raden som klickades strax före, i stället för till texten.

## Ta bort Favoritmarkera ur verktygsraden för valda dokument

*Tillagd 2026-11-14.*

**Vad är fel:** när dokument är valda i biblioteket visar verktygsraden knappen **Favoritmarkera** (`libraryBatchFavourite` i `src/ui/dashboard.html`/`dashboard.js`). Den gör samma sak som stjärnan på varje dokument, kan bara sätta favorit och tar plats i en redan full rad.

**Vad användaren märker:** ett extra val som inte behövs; stjärnan räcker för att markera och avmarkera favoriter.

**Förslag:** ta bort knappen och dess klickhanterare och oanvända texter i alla språk (till exempel `library.batchFavourited`). Behåll stjärnan på varje dokument och filtret Favoriter. Kontrollera om `T9DocumentBatchOperations.favourite` och dess test då blir oanvända.

## Värde som väljs i ett namnfält

*Tillagd 2026-11-13.*

**Att kontrollera:** väljer användaren en leverantör eller kund i namnfältet (Leverantörsnamn) i stället för i nummerfältet, skriver testet det valda numret i namnfältet. Business Central brukar godta ett nummer där, men det är inte prövat genom uppspelning.

**Förslag:** spela in ett sådant val, exportera och spela upp. Godtas inte numret ska testet skriva i nummerfältet i stället.

## Klick i en radcell får fel kolumnnamn

*Tillagd 2026-11-16.*

**Vad är fel:** i Prod.order komponenter klickade användaren i cellen **Bokföringsmetod** (som visade Bakåt) och valde sedan Manuellt. Dokumentet fick ett eget steg "Välj *Artikelnummer* **Bakåt**": klicket fick namnet på en annan kolumn och blev ett eget steg före valet.

**Vad användaren märker:** ett extra, felaktigt steg före valet av alternativ.

**Att kontrollera:** hur cellens kolumn hittas i `src/recorder/content.js` (kolumnrubrik via `aria-colindex` eller `cellIndex`); dolda eller låsta kolumner kan ge fel rubrik. Behöver den verkliga inspelningens händelser, till exempel genom förbättringsdata. När kolumnen blir rätt kan klicket räknas till valet i samma fält, som klick på fältet redan gör (`field-click-before-entry`).

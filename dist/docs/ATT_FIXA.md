# Att fixa

Kända fel, brister och kontroller som behöver göras i BC Process Studio. Varje punkt beskriver vad som är fel, vad användaren märker och ett förslag. En punkt är bekräftad i koden eller i Business Central om inget annat sägs; det som bara är en misstanke står som **Att kontrollera**. När en punkt är åtgärdad flyttas den till CHANGELOG och tas bort här. Nya funktioner hör hemma i [FUTURE_FEATURES.md](FUTURE_FEATURES.md).

## Markeringen "Viktigt steg" gör ingenting i dokumentet

*Tillagd 2026-11-16.*

**Vad är fel:** knappen Viktigt steg i den flytande inspelningsrutan sparar en markering (`guidanceKind: "important"`). Den förs vidare till stegets `important` i `session-interpretation-pipeline.js`, men ingen granskningsvy, förhandsvisning eller export läser den.

**Vad användaren märker:** man klickar på Viktigt steg och får bekräftelsen att steget markerats, men dokumentet ser likadant ut som utan markering.

**Förslag:** bestäm vad ett viktigt steg ska innebära, till exempel en framhävd ruta i dokumentet och en markering i granskningen, och visa det. Tills dess finns knappen inte i den nya inspelningspanelen, bara i den flytande rutan.

## Sektioner från inspelningen heter "Sektion 1" på alla språk

*Tillagd 2026-11-16.*

**Vad är fel:** när man väljer Ny sektion under inspelningen skapar `review-studio.js` sektionerna med det fasta namnet `Sektion ${index + 1}`, på svenska, oavsett dokumentspråk.

**Vad användaren märker:** ett engelskt eller tyskt dokument får sektionsrubriker på svenska tills man byter namn på dem i granskningen.

**Förslag:** ta namnet från dokumentspråkets katalog ("Section 1", "Abschnitt 1" och så vidare), på samma sätt som andra genererade texter.

## Sekretesstexten för Edge-butiken stämmer inte längre

*Tillagd 2026-11-13. Bör vara klar före nästa inlämning till Edge-butiken.*

**Vad är fel:** [EDGE_ADDONS_SUBMISSION.md](EDGE_ADDONS_SUBMISSION.md) säger att integritetsmaskeringen döljer känsliga inmatningar. Sedan 4.7.258 sparas det användaren själv skriver i ett fält även omaskerat i inspelningen, bredvid det maskerade värdet, så att ett Page Scripting-test kan mata in samma sak (`typedValue`, se [PAGE_SCRIPTING.md](PAGE_SCRIPTING.md)). Lösenord, hemligheter, tokens och nycklar sparas aldrig.

**Vad användaren märker:** inget i produkten, men butikstexten beskriver hanteringen av data fel.

**Förslag:** skriv att maskeringen gäller det som visas i dokument, exporter och felrapporter, och att det användaren skriver sparas lokalt i inspelningen för testexporten och följer med när användaren själv exporterar eller synkroniserar biblioteket. Låt en människa granska formuleringen mot Edges gällande policy.

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

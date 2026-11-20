# Att fixa

Kända fel, brister och kontroller som behöver göras i BC Process Studio. Varje punkt beskriver vad som är fel, vad användaren märker och ett förslag. En punkt är bekräftad i koden eller i Business Central om inget annat sägs; det som bara är en misstanke står som **Att kontrollera**. När en punkt är åtgärdad flyttas den till CHANGELOG och tas bort här. Nya funktioner hör hemma i [FUTURE_FEATURES.md](FUTURE_FEATURES.md).

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

## Värde som väljs i ett namnfält

*Tillagd 2026-11-13.*

**Att kontrollera:** väljer användaren en leverantör eller kund i namnfältet (Leverantörsnamn) i stället för i nummerfältet, skriver testet det valda numret i namnfältet. Business Central brukar godta ett nummer där, men det är inte prövat genom uppspelning.

**Förslag:** spela in ett sådant val, exportera och spela upp. Godtas inte numret ska testet skriva i nummerfältet i stället.

## Klick i en radcell får fel kolumnnamn

*Tillagd 2026-11-16.*

**Vad är fel:** i Prod.order komponenter klickade användaren i cellen **Bokföringsmetod** (som visade Bakåt) och valde sedan Manuellt. Dokumentet fick ett eget steg "Välj *Artikelnummer* **Bakåt**": klicket fick namnet på en annan kolumn och blev ett eget steg före valet.

**Vad användaren märker:** ett extra, felaktigt steg före valet av alternativ.

**Att kontrollera:** hur cellens kolumn hittas i `src/recorder/content.js` (kolumnrubrik via `aria-colindex` eller `cellIndex`); dolda eller låsta kolumner kan ge fel rubrik. Behöver den verkliga inspelningens händelser, till exempel genom förbättringsdata. När kolumnen blir rätt kan klicket räknas till valet i samma fält, som klick på fältet redan gör (`field-click-before-entry`).

## Sökningen till Artikeljournaler blir tre otydliga steg

*Tillagd 2026-11-20.*

**Vad är fel:** i inspelningen av en artikeljournal (Salico UAT) blev vägen via Sök till Artikeljournaler tre steg i dokumentet: "Välj Sök, ange söktext i Sök och välj Artikeljournaler" med en bild av en nästan tom sida, "Ange art jour i Berätta vad du vill göra" med en bild som redan visar Artikeljournalmallslista, och "Välj posten Artikeljournaler Uppgifter □ på sidan Kvalitetskontroll Stackikon", där en ikon blev en ruta. Valet av journalmall (ARTIKEL) syns inte som eget steg.

**Vad användaren märker:** början av instruktionen är svår att följa och bilderna stämmer inte med texten.

**Att kontrollera:** hur sökningen grupperas i `src/engine/event-step-grouping.js` (arbetas på av Visa mig-sessionen 2026-11-20, så samordna) och vilken bild varje steg får. Förväntat: ett steg "Sök efter och öppna Artikeljournaler" och ett steg "Välj journalmallen ARTIKEL". Ikontecken (privat användningsområde) ska tas bort ur namnet.

**Rättat 2026-11-20 (ej släppt):** dokumentet får nu "Sök efter __art journ__ och öppna **Artikeljournaler**." och sedan "Välj posten **ARTIKEL** på sidan **Artikeljournalmallslista**." (kontrollerat mot Artikeljournal Test Salico UAT 2026-11-20).
- Valet av ARTIKEL är ett eget steg. Inspelaren gav klicket i mallistan samma interaktion som sökträffen som öppnade den. Nu delar grupperingen ett postval i en annan sida än det val eller den åtgärd som öppnade den (`dialogPageAction`). Ett postval i en uppslagslista hör fortfarande till uppslaget.
- Sökträffen känns igen på klientens `PageSearchForm`, på alla språk. Inspelaren sparar nu träffens namn utan dess sort (namn och sort ligger i egna element i BC, `ms-itemName--` och `ms-itemType--`). I äldre inspelningar namnges träffen av sidan som användaren sedan arbetar på. Sidans namn översätts nu till dokumentspråket även när träffen inte är en lista (`session-interpretation-pipeline.js`).

**Kvar:** vilken bild sökstegets skärmbild visar har inte kontrollerats i ett nyskapat dokument.

## Klick på en listruta får alla val i namnet

*Tillagd 2026-11-20.*

**Vad är fel:** ett klick på Transaktionstyp i en artikeljournalrad blev steget "Välj Inköp Försäljning Positiv justering Negativ justering Lägsta pris Advanced Pricing Ej slutfört 0,00 på sidan Artikeljournaler", med hela listan inramad i bilden. Namnet är radens och listrutans hela text.

**Vad användaren märker:** ett obegripligt extra steg.

**Att kontrollera:** klicket på en `select` ska räknas till valet i samma fält (som `field-click-before-entry`), inte bli ett eget steg, och dess namn ska vara fältets rubrik. Page Scripting-exporten påverkas inte: den skriver valet som ett nummer.

**Kontrollerat 2026-11-20:** i Artikeljournal Test Salico UAT 2026-11-20 har klicken på Transaktionstyp namnet "Transaktionstyp", och med dagens kod blir de steget "Välj Positiv justering i Transaktionstyp". Felet syns inte där och inte heller i biblioteksexporten från 14:54. Behöver den inspelning där steget syntes, för att se om felet finns kvar.

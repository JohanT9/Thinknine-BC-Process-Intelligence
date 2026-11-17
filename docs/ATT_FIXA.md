# Att fixa

Kända fel, brister och kontroller som behöver göras i BC Process Studio. Varje punkt beskriver vad som är fel, vad användaren märker och ett förslag. En punkt är bekräftad i koden eller i Business Central om inget annat sägs; det som bara är en misstanke står som **Att kontrollera**. När en punkt är åtgärdad flyttas den till CHANGELOG och tas bort här. Nya funktioner hör hemma i [FUTURE_FEATURES.md](FUTURE_FEATURES.md).

## Sekretesstexten för Edge-butiken stämmer inte längre

*Tillagd 2026-11-13. Bör vara klar före nästa inlämning till Edge-butiken.*

**Vad är fel:** [EDGE_ADDONS_SUBMISSION.md](EDGE_ADDONS_SUBMISSION.md) säger att integritetsmaskeringen döljer känsliga inmatningar. Sedan 4.7.258 sparas det användaren själv skriver i ett fält även omaskerat i inspelningen, bredvid det maskerade värdet, så att ett Page Scripting-test kan mata in samma sak (`typedValue`, se [PAGE_SCRIPTING.md](PAGE_SCRIPTING.md)). Lösenord, hemligheter, tokens och nycklar sparas aldrig.

**Vad användaren märker:** inget i produkten, men butikstexten beskriver hanteringen av data fel.

**Förslag:** skriv att maskeringen gäller det som visas i dokument, exporter och felrapporter, och att det användaren skriver sparas lokalt i inspelningen för testexporten och följer med när användaren själv exporterar eller synkroniserar biblioteket. Låt en människa granska formuleringen mot Edges gällande policy.

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

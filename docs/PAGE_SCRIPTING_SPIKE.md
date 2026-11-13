# Test: kan en inspelning exporteras till Page Scripting?

Page Scripting i Business Central pekar ut fält och knappar med sidans namn, kontrollens
**AL-namn** (till exempel `Code`, `Control1`, `Control_New`) och en kort kod, `runtimeRef`.
BC Process Studio sparar i dag främst den text som syns på skärmen. Det här testet visar om
webbklienten ger oss AL-namnen och runtimeRef någonstans. Gör den det går en direkt export
att bygga. Gör den inte det återstår vägen åt andra hållet: att läsa in Page Scripting-filer
i BC Process Studio.

Testet tar ungefär en timme och ändrar ingenting i produkten.

## Det här behöver du

- En **sandlåda** i Business Central med testdata. Använd inga riktiga kunddata.
- Behörigheten **PAGESCRIPTING - REC** för din användare.
- BC Process Studio installerat i Edge.
- Node.js på datorn, för jämförelseskriptet.

Använd **samma språk** i BC under hela testet, eftersom sidnamnen i Page Scripting följer språket.

## Flöden att spela in

Spela in två korta flöden som tillsammans täcker fält, listor och åtgärder:

1. **Betalningsvillkor:** öppna listan, välj **Ny**, fyll i Kod och Förfallodatumformel, stäng.
2. **Försäljningsorder:** skapa en ny order, välj kund, lägg till en rad med artikel och antal,
   välj **Frisläpp** (inte Bokför, så att inget bokförs).

## Steg för steg

Gör stegen för varje flöde.

1. **Starta BC Process Studio-inspelningen** i Edge.
2. **Starta Page Scripting:** öppna inställningar (kugghjulet) och välj **Sidskriptning**
   (Page Scripting). Välj **Starta ny** så att inspelningen börjar.
3. **Utför flödet** i lugn takt.
4. **Stoppa båda inspelningarna.**
5. **Spara Page Scripting-filen:** välj **Spara** i Page Scripting-fönstret. Du får en `.yml`-fil.
6. **Exportera BC Process Studio-dokumentet:** öppna dokumentet i biblioteket och exportera
   det. Du får en `.bcps`-fil.

## Jämför filerna

Kontrollera att `.yml`-filen och `.bcps`-filen kommer från **samma flöde**. Kör sedan i
projektmappen (`C:\Development\Thinknine-BC-Process-Intelligence`), med hela sökvägen till
filerna inom citattecken:

```bash
node scripts/compare-page-scripting.js "<folder>/betalningsvillkor.yml" "<folder>/betalningsvillkor.bcps" --out "<folder>/jamforelse.md" --snippet "<folder>/konsol.js"
```

Skriptet läser båda filerna och ändrar ingenting. Det skriver:

- `jamforelse.md`: för varje AL-namn och runtimeRef i Page Scripting-filen, om och var det
  finns i BC Process Studios inspelning.
- `konsol.js`: ett skript som letar efter samma namn direkt på BC-sidan.

## Kontrollera BC-sidan

Inspelaren sparar bara vissa attribut. Därför letar konsolskriptet i alla attribut på sidan:

1. Öppna samma sida i BC igen, till exempel Betalningsvillkor.
2. Tryck **F12** och välj fliken **Konsol**.
3. Välj ramen där sidan visas i listan överst i konsolen (oftast den som heter något med
   `client` eller `default`, inte `top`).
4. Klistra in innehållet i `konsol.js` och tryck Enter.

En tabell visar varje namn, hur många gånger det hittades och i vilka attribut.

## Tolka resultatet

| Jämförelsen | Konsolskriptet | Slutsats |
|---|---|---|
| Alla namn hittas | – | Export ser genomförbar ut. Nästa steg är att testa fler sidor. |
| Namn saknas | Hittar dem i ett attribut | Export går. Inspelaren behöver spara det attributet. |
| Namn saknas | Hittar inget | Direkt export går inte. Välj importvägen. |

Om runtimeRef hittas, gör om inspelningen av samma flöde efter nästa uppdatering av
sandlådan och se om koden är densamma. Ändras den behöver en export läsa den på nytt
varje gång.

## Skicka tillbaka

Lägg `jamforelse.md` och konsolens tabell (en skärmbild räcker) i en ny chatt eller i
sessionen, så tolkar vi resultatet tillsammans. `.bcps`-filen innehåller skärmbilder och
behöver inte skickas.

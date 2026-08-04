# Thinknine BC Process Intelligence 4.1.1 RC

Version 4.1.1 förbättrar exportupplevelsen för Word-dokument utan att ändra den
granskade dokumentmodellen eller innehållet i exporterade dokument.

## Exportupplevelse

- Inställningen för att alltid visa dialogen Spara som har tagits bort.
- Filnamnsmallar och automatisk konflikthantering finns kvar.
- Filnamnet förhandsvisas direkt i dashboarden.
- Preview och export använder samma generator och samma filnamn vid export.
- Variabelknappar infogar tokens vid markören eller ersätter markerad text.

## Filnamnsvariabler

Följande variabler stöds:

```text
{process}
{environment}
{date}
{time}
{version}
```

Variablerna definieras på ett ställe som används av generatorn, valideringen,
knapparna och dashboardens hjälptext. Företags- och användarvariabler exponeras
inte eftersom sessionerna saknar tillförlitliga värden för dem.

## Validering

Dashboarden upptäcker okända variabler, saknad avslutande klammer, dubbla
inledande klamrar, tomma variabler, ogiltiga tecken och fristående avslutande
klamrar. Valideringen är rådgivande och blockerar inte exporten.

## Tillgänglighet

- Mallfältet är kopplat till hjälptext, preview och valideringsfeedback.
- Preview och felmeddelanden använder samordnade live-regioner utan dubbla
  annonseringar.
- Variabelknapparna har individuella skärmläsaretiketter.
- Tab, Shift+Tab, piltangenter, Home och End stöds.

## Kvalitet

Exportinställningarna täcks av beteendetester för filnamnsgenerering, preview,
validering, markörposition, textmarkering, variabelknappar, tangentbord och ARIA-
tillstånd. Edge-tillägget fortsätter att fungera helt lokalt utan CDN-anrop.

## Uppgradering

Bygg om `dist` och ladda om tillägget i Edge:

```powershell
npm.cmd install
npm.cmd run ci
```

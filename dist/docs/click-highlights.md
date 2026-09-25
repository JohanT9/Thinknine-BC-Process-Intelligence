# Klickmarkering under inspelning

En turkos ram visas i ungefär en sekund runt kontrollen som klickas på under
process- och felinspelning. Om kontrollen saknar användbara gränser visas en
liten ring vid klickpunkten. Markeringen bekräftar klicket, inte att affärsåtgärden lyckades.

Inställningen **Visa klickmarkeringar under inspelning** finns under
**Inställningar för dokumentation, export och inspelning → Inspelning**.
Den är aktiverad som standard. Avmarkera och välj **Spara inställningar** för
att stänga av den. Ändringen gäller även en pågående inspelning.

Markeringen blockerar inte inmatning och ändrar inte Business Centrals kontroller.
Den fungerar i injicerade ramar och öppna HTML-dialoger, försvinner vid rullning,
storleksändring och avslutad inspelning och respekterar minskad rörelse.
Webbläsarens egna menyer och sidor där tillägget saknar åtkomst kan inte markeras.

Före en skärmbild döljs markeringen och inspelningsindikatorn i samtliga
tillgängliga ramar. Överlappande skärmbilder har separata identifierare så att
en avslutad skärmbild inte visar markeringen medan en annan fortfarande tas.
Markeringen lagras inte som en annotering i dokumentet.

Kontroller: `npm run test:click-highlight`, språk- och inställningstester samt
isolerade Edge-kontroller av klickgenomsläpp, dialoger, iframes och utseende.
En genomgång i en riktig Business Central-miljö rekommenderas före distribution.

Ramen följer kontrollens position och storlek medan den visas. Den tas bort
när kontrollen försvinner eller döljs, när sidans adress ändras eller när
användaren navigerar i historiken. Uppdateringen körs bara under markeringens
korta livstid och avbryts vid nästa klick eller avslut.

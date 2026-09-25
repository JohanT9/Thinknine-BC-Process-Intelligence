# BC Process Studio — etapp 1B

Implementerat lokalt i `C:\Development\Thinknine-BC-Process-Intelligence`.

## Leverans

- `src/engine/canonical-process-adapter.js`: projekterar befintliga business tasks, inspelningsevent och befintlig semantisk klassificering till Canonical Process.
- Bevarar referenser till inspelningsevent, normaliserade event, steggrupper, semantiska handlingar och screenshots.
- Fältvärden pekar tillbaka till `raw`-fält i inspelningen. Captions bevaras ordagrant.
- Skapar deterministiska processrevisioner och steg-ID:n. Kunskapsklassificering och språk påverkar inte steg-ID:n.
- Referenser till faktiska resultatbevis förs vidare. Kunskapsregler kräver uttryckligt release-ID; manuell klassificering kräver ändrings-ID och revisions-ID.
- Validatorn kontrollerar nu också normaliserade event-, grupp- och action-referenser när dessa sammanhang skickas in.
- Service workern och dashboarden läser in schema och adapter. Båda nya filerna finns i den byggda distributionen.
- I den här etappen anropas adaptern av dashboardens `prepareSessionModel`. Den följer med i dashboardens aktiva modell bredvid befintlig tolkning. Befintlig review, dokumentprojektion och export använder fortfarande sina nuvarande indata.

Fingerprinten använder två 64-bitars FNV-1a-strömmar. Den är deterministisk och lämplig för lokala stabila identiteter, men är inte en kryptografisk signatur.

## Verifierat

- `npm run build`: godkänt.
- `npm run lint`: godkänt efter första adapterversionen.
- `node --check` för schema- och adapterfiler: godkänt efter slutliga korrigeringar.
- Jämförelse av källfilerna med byggd distribution och kontroll av runtime-laddning: godkänt.
- `git diff --check`: inga whitespacefel; Git rapporterade radslutsvarningar.

Inga nya tester lades till eller kördes för 1B. Node 20 CI har inte körts. Dashboardprojektionen lagras inte beständigt.

Nästa steg är att jämföra Canonical Process med verkliga registreringar och koppla godkända konsumenter när spårbarhet och ID är verifierade.

# Thinknine BC Process Intelligence v3.5.0

Detta är den första git-redo, modulära versionen av Edge-projektet.

## Struktur

```text
src/
├── recorder/
├── engine/
│   ├── noise-filter.js
│   ├── entity-memory.js
│   ├── session-graph.js
│   ├── confidence-engine.js
│   └── documentation-engine.js
├── ui/
└── knowledge-packs/

dist/                 Laddas som opaketerat Edge-tillägg
scripts/build.js
tests/engine.test.js
```

## Kommandon

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run check
```

## Edge-installation

Öppna `edge://extensions`, välj **Läs in opaketerat** och välj mappen `dist`.

## Nya exportfiler

- `session-graph.json`
- `confidence-report.json`

Session Graph grupperar uppgifter per affärsentitet. Confidence Report visar sessionskvalitet, Knowledge Pack-träff och grafens täckning.

## Nästa milstolpe

Review Mode ska arbeta direkt mot `business-tasks.json` och `session-graph.json`.


## GitHub-arbetsflöde

Varje push eller pull request mot `main` kör:

```text
lint → tester → build → syntaxkontroll
```

Skapa en release genom att tagga en version:

```powershell
git tag v3.5.1
git push origin v3.5.1
```

GitHub Actions bygger då automatiskt en Edge-ZIP och bifogar den till en GitHub Release.


## Review Studio 3.6

Öppna en avslutad session och välj **Granska**.

Review Studio stöder:

- redigering av instruktioner
- kommentarer
- godkännande per steg
- ändrad ordning
- manuella steg
- borttagning av steg
- skärmbildsförhandsvisning
- lokal lagring per session

Den sparade modellen används som underlag för kommande Word- och PDF-generator.


## Fast Edge development folder

Edge ska alltid läsa det opaketerade tillägget från:

```text
C:\Development\Thinknine-BC-Process-Intelligence\dist
```

Kör inför varje omladdning:

```powershell
npm.cmd run build
```

Byggskriptet synkar `dist` från `src` och sätter versionsnumret i `manifest.json` från `package.json`.

Windows-hjälpskript:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-and-open.ps1
```


## Synlig Review Studio

På sidan **Sessioner och export** visas nu knappen **Granska** för avslutade sessioner.

Klicka **Granska** för att öppna Review Studio och kontrollera att gränssnittet fungerar innan fler funktioner läggs till.


## Word Generator 3.7

Öppna en session i **Review Studio** och välj **Exportera Word**.

Dokumentet innehåller:

- försättssida
- dokumentmetadata
- innehållsförteckningsfält
- syfte
- förutsättningar
- granskade arbetssteg
- skärmbilder
- kommentarer
- förväntat resultat
- versionshistorik
- sidhuvud och sidnummer

Word-exporten arbetar mot den sparade granskningsmodellen. Råhändelser används inte direkt i dokumentet.


## Hotfix 3.7.1

Version 3.7.1 återställer dashboardens uppstart och dataladdning.

Inställningar läses nu med standardvärden som fallback och sessionlistan
renderas även när lagringen är tom eller ett äldre lagringsformat används.

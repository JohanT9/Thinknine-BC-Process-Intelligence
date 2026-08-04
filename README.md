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

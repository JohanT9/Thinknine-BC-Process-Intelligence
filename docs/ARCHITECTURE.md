# Architecture 3.5

## Documentation Excellence 4.4

Den semantiska dokumentmodellen är en fristående gräns för dokumentinnehåll:

```text
Review (oförändrad)
  ↓ framtida projektion
Semantic Document Model
  ↓ framtida layoutplan
Word / framtida PDF-renderare
```

RC1 implementerar endast modellgränsen. Den har inga beroenden till Review,
DOCX, DOM, CSS eller canvas och används ännu inte av exportflödet.

```text
Recorder
  ↓
Noise Filter
  ↓
Context Builder
  ↓
Entity Memory
  ↓
Knowledge Pack
  ↓
Business Tasks
  ↓
Session Graph
  ↓
Confidence Engine
  ↓
Documentation Engine
```

Modulerna är browser-kompatibla IIFE-moduler och kan samtidigt importeras med CommonJS i enhetstester.

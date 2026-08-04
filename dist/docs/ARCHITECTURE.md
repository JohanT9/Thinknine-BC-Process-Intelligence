# Architecture 3.5

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

# Architecture 3.5

## Documentation Excellence 4.4

Den semantiska dokumentmodellen är en fristående gräns för dokumentinnehåll:

```text
Review (oförändrad)
  ↓ Review Document Projector
Semantic Document Model
  + Document Theme System
  ↓ Document Planner
Document Plan
  ↓ formatadapter + förberedda medier
Word / framtida PDF-renderare
```

RC2 lägger till en ren och deterministisk projektor som ensam översätter Review
till modellen. Projektorn skapar provenance och separat diagnostik men äger
aldrig Review-objekt eller bilddata. Modell och projektor saknar beroenden till
DOCX, DOM, CSS och canvas och används ännu inte av exportflödet.

RC3 introducerar en parallell, innehållsoberoende källa för dokumentutseende.
Temasystemet definierar endast värden och tokenrelationer. Det inspekterar inte
Review eller Semantic Document och beräknar inte placering, sidbrytning eller
renderarformat. Den framtida Document Planner blir första konsumenten av både
semantisk modell och ett upplöst tema.

RC4 implementerar denna kombination. Planner är en ren transformation och den
enda producenten av Document Plans. Planen innehåller stabila referenser till
semantiskt innehåll samt renderer-neutrala beslut om flöde, komponenter,
gruppering, synlighet och sidintention. Framtida adaptrar är konsumenter och får
inte återskapa planeringslogik.

RC5 gör kedjan till produktionsväg för Word. Word-adaptern tar endast emot den
validerade, immutabla planen och förberedda bildbytes. Dashboarden är composition
root men fattar inga layoutbeslut. DOCX-objekt och Word-enheter förekommer endast
i adaptern; Review-persistence och skärmbildslagring är oförändrade.

RC6 gör planens komponenter explicita och återanvändbara. `document-components`
äger normalisering och immutabilitet, `document-component-registry` äger de
inbyggda definitionerna och utökningspunkten, och
`document-component-validation` äger kontraktskontrollerna. Planner är fortsatt
den enda producenten av komponentinstanser och Document Plans. Komponenterna är
renderer-neutrala och innehåller inga DOCX-, XML-, DOM-, PDF- eller Word-enheter.

RC7 lägger en separat analysgren bredvid rendering:

```text
Semantic Document + Document Plan
  ↓ Document Quality Rules
Immutable diagnostics + quality summary
```

Kvalitetslagret läser endast dokumentet och planen. Findings lagras inte i någon
av dem och påverkar varken Planner eller renderer. Regelregistret kan utökas utan
ändring av exekveringsmotorn, och ett regelundantag isoleras så att exporten
fortsätter.

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

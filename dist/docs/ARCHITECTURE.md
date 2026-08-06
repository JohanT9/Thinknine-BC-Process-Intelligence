# Architecture 4.6

## Semantic Interaction Rules Engine 4.6 R3

```text
Review → Review Projector → Semantic Document → Semantic Interaction Rules
  → Language Excellence → Screenshot Intelligence → Document Profile → Theme
  → Document Planner → Components / Diagnostics → Document Workspace / Word
```

`semantic-interaction-engine.js` is the single owner of interaction
consolidation. The Review adapter delegates its compatibility view to this same
engine; it contains no rules. The ordered registry evaluates specific rules
before generic rules. Equal-priority conflicts and unsafe inference fall back to
the original sequence.

Each result is an immutable Semantic Action containing stable action and source
identities, ordered event references, selected value, target field, every
screenshot and annotation reference, raw interactions and preserved future
metadata. The projector carries interaction semantics without interpreting
them. The engine never consumes Review directly, mutates input, evaluates image
quality or applies profile-specific language.

Focus-only transitions and selection prompts without a resulting value are
non-visible Semantic Actions stored in the workflow section's suppressed trace.
Deterministic focus/record/result sequences become one lookup action. This keeps
technical navigation available for diagnostics without creating document steps.

`screenshot-capture-policy.js` independently decides capture eligibility before
the recorder queue. Non-empty input/change events receive the dedicated
`field-input` category. That category cannot reuse a nearby action capture or a
capture for another field, while repeated events for the same field may share
one image. Focusout remains non-capturing.

Instruction text carries renderer-neutral semantic markers: `__value__` denotes
a manually entered value and `**label**` denotes a UI label. `text-format.js` is
the single parser and emits plain accessible text plus bold run metadata.
Document Workspace and Word consume those runs; Review and Semantic Document do
not store HTML, DOCX runs or renderer-specific formatting.

An immutable projected document revision is processed once and cached by object
identity. Language Excellence consumes the semantic-action document. Screenshot
Intelligence remains the sole image-selection owner. Both Document Workspace
and Word consume the same downstream Document Plan.

## Screenshot Intelligence 4.6 R2

```text
Review → Review Projector → Semantic Document → Language Excellence
  → Screenshot Intelligence → Document Profile → Theme → Document Planner
  → Components / Diagnostics → Document Workspace / Word Adapter
```

`screenshot-intelligence.js` solely owns candidate normalization, explainable
evaluation and selection. It consumes no Review, DOM, image bytes, canvas,
Planner or renderer structure. The composition root derives immutable candidate
metadata from existing recorder events and screenshot paths. Selection returns a
new Semantic Document plus disposable explanations; neither is persisted to
Review.

Review Projector carries stable source-event references and the minimal optional
`screenshotSelection: { mode: "manual", screenshotRef }` contract into step
semantics. A valid manual reference is authoritative. Annotated candidates are
protected, and multiple annotated candidates retain the previous presentation
instead of orphaning annotations.

Language output is the selection input. The selected document is the only
document passed to Planner, so Document Workspace and Word cannot select
independently. Results are cached only for immutable document and candidate
identities and per profile; mutable inputs always run again.

## Language Excellence 4.6 R1

```text
Review → Review Projector → Semantic Document
  → Language Excellence → Document Profile → Theme → Document Planner
  → Components / Diagnostics → Document Workspace / Word Adapter
```

`language-excellence.js` is the single owner of deterministic writing rules.
It accepts only Semantic Document plus the selected profile's language contract
and returns a new normalized, recursively immutable Semantic Document. It never
imports Review, UI, Planner or a renderer. Unknown document fields and unknown
future block kinds pass through unchanged.

The composition pipeline retains the projector result as an immutable source and
passes only the language-enhanced copy downstream. Document Profile owns tone
configuration, while the language layer owns wording. Theme and Planner remain
presentation-only. Document Workspace and Word continue consuming the same
validated Document Plan, so no wording logic leaks into either renderer.

Processing is cached by immutable source-document identity and profile tone.
A changed Review produces a new projected document and therefore a new cache
entry; repeated planning for an unchanged revision and profile reuses the same
frozen result. No language output is persisted into Review or screenshot storage.

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
DOCX, DOM, CSS och canvas. Sedan RC5 är denna projektion den enda aktiva vägen
från Review till Word-export.

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

RC8 aktiverar professionell presentation inom samma ansvarsfördelning:

```text
Semantic Document (vad dokumentet säger)
  + Resolved Theme (visuella tokens)
  ↓ Document Planner
Document Plan (hierarki, gruppering, presentation och flödesintention)
  ↓ Word Adapter
DOCX (formatmappning, ingen planering)
```

Planner äger bildbetoning, sekvensgruppering, metadataformat, sektionsövergångar,
callout-roller, whitespace-intention och `keep`-relationer. Alla visuella värden
kommer från det upplösta temat. Word-adaptern mappar endast dessa beslut till
`docx`-objekt och Word-enheter. Review Projector och Semantic Document ändrades
inte, och kvalitetsdiagnostiken är fortsatt rådgivande och skrivskyddad.

RC9 verifierar ansvaren som produktionsgränser. Ingen renderer läser Review,
Planner skapar inga Word-objekt, projektorn planerar inte presentation och
kvalitetslagret ändrar varken semantik eller plan. Den äldre exportören är
fortsatt karantäniserad för kompatibilitet och laddas inte av dashboarden.

## Document Workspace 4.5

v4.5 introducerar två samordnade arbetsytor över samma dokumentkälla:

```text
Review Workspace (redigering)
  ↓ Review
Review Projector → Semantic Document + Theme → Document Planner → Document Plan
                                                        ↙             ↘
                                      Document Workspace Renderer   Word Adapter
```

`document-workspace.js` är en ren, deterministisk planrenderer. Den skapar en
immutable och renderer-neutral workspace-modell och känner inte till Review,
DOM eller Word. `document-workspace-view.js` är den tunna DOM-adaptern som
materialiserar modellen. `workspace-controller.js` äger endast aktiv arbetsyta
och synkroniseringsrevision.

Dashboarden är fortsatt composition root. Den kör samma pipeline och samma
annotationskomposition för Document Workspace och Word, men äger ingen
dokumentstruktur. Stabilt identifierade plansektioner gör att DOM-adaptern kan
ersätta ändrade avsnitt och återanvända oförändrade avsnitt.

UX2 lägger ett fristående presentationslager efter DOM-adaptern:

```text
Document Plan → pure workspace renderer → stable semantic DOM
                                           ↓
                         Document Workspace Experience
                         (zoom, mode, page, adaptive presentation)
```

`document-workspace-experience.js` äger immutable vypreferenser, zoom- och
navigeringsberäkningar samt lokal preferensserialisering. Dashboarden applicerar
resultatet som CSS, sektionssynlighet och ARIA-state på befintlig DOM. Lagret
kan därför inte ändra Semantic Document, tema, planner, komponenter eller Word.
Vypreferenser använder en separat lokal nyckel och ingår aldrig i Review.

UX3 introducerar `workspace-context.js` som enda ägare av delad
navigationsposition. Kontexten innehåller endast stabila identiteter och
navigationsavsikt. Den äger ingen Review-logik, rendererlogik eller DOM.
Arbetsytorna känner inte till varandra; dashboarden binder deras identiteter vid
composition root. Kontextbyte ändrar endast fokus, markering och position i
redan renderad DOM och passerar aldrig Review Projector, Semantic Document,
Theme, Planner eller Word Adapter.

UX4 lägger en skrivskyddad advisory-projektion bredvid renderingen:

```text
Semantic Document + Document Plan + Quality Diagnostics + Workspace Context
                                ↓
                   Documentation Intelligence
                                ↓
        Qualitative Health + immutable grouped Guidance
```

`documentation-intelligence.js` återanvänder diagnostics och översätter dem till
positivt formulerad vägledning. Modulen läser aldrig Review, muterar inga indata,
blockerar aldrig export och anropar ingen renderer. Dashboarden visar modellen
med stabil ID-reconciliation och använder Workspace Context för navigation.

UX5 inför ett renderer-neutralt förväntningslager mellan Semantic Document och
presentationen:

```text
Semantic Document + Document Profile
              ↓
   cached Resolved Theme + Document Plan variant
              ↓
Documentation Intelligence + Document Workspace
```

`document-profile.js` äger schema, normalisering, register och inbyggda
profiler. En profil beskriver förväntningar men skapar eller ändrar aldrig
dokumentinnehåll. Dashboarden beräknar immutable tema-/planvarianter en gång per
dokumentrevision. Profilbyte väljer en cachad variant, så Review, Semantic
Document och komponenter regenereras inte vid bytet. Word använder fortsatt sin
oförändrade produktionspipeline.

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

## Document Library 4.5 UX6

UX6 lägger ett separat metadataindex bredvid dokumentproduktionskedjan:

```text
Session metadata ───────────────┐
Already materialized Document  ├─→ Document Library metadata index
Health/profile/theme summaries ┘                 ↓
                                      Search/filter/cards/preview

Review → Semantic Document → Planner → Word (oförändrad och on demand)
```

`document-library.js` äger versionerad normalisering, ett förberäknat
sökindex, kombinerbara filter, sortering, profilgruppering och selection state.
Modellen är renderer-neutral, immutable och bevarar okända framtida fält.
`document-library-view.js` är en tunn DOM-adapter för kort och preview.
Dashboarden är composition root och kopplar ett biblioteksprojekt till dess
befintliga session med stabilt `projectId`/`sessionId`.

Biblioteksnyckeln i lokal extension storage innehåller metadata endast. Den får
aldrig innehålla Review, Semantic Document, Document Plan, Word-strukturer,
renderer-state eller skärmbildsbytes. Grundposter projiceras från redan laddad
sessionslista. Rikare metadata materialiseras enbart när den ordinarie Document
Workspace-pipelinen redan har körts; biblioteket initierar den aldrig.

## Batch Operations 4.5 UX7

`document-batch-operations.js` är ett renderer-neutralt kommandolager ovanpå
Document Library-metadata:

```text
Visible library IDs + modifiers → immutable multi-selection
Selected metadata + explicit fields → batch command → normalized metadata
Export intent → dashboard queue → one Review at a time → unchanged Word pipeline
```

Domänen äger urval, range/toggle/select-all, reconciliation, explicit
metadata-patch, exportplan och deleteplan. Den importerar endast
`document-library.js` och känner inte till Review, Semantic Document, Planner,
Document Plan, DOM eller Word. Dashboarden äger bekräftelse, progress,
persistence och externa effekter.

Profil- och temaassignment lagras som presentationsmetadata. Profilbyte
ogiltigförklarar den gamla rådgivande hälsosnapshoten tills ordinarie Document
Workspace senare materialiserar nya förväntningar. Batch-export laddar aldrig
en Review-samling; ett projekt hämtas, renderas och släpps innan nästa startar.

## Workflow Polish 4.5 UX8

UX8 ändrar inga domängränser. Det renodlar dashboardens interaktionsadapter:

```text
Metadata change → rebuild immutable library index → reconcile full view
Selection/focus change → patch visible card state + preview only
Filter/sort change → reuse index → reconcile bounded result DOM
```

`document-library-view.applySelection` uppdaterar endast `data-selected`, native
checkbox, roving tab stop och `aria-current`. Semantiskt kortinnehåll och noder
återanvänds. Dashboarden behåller högst 200 renderade kort men söker och väljer
fortsatt i hela metadataindexet.

Metadata-persistence använder rollback innan synlig reconciliation. Öppning av
Review sparar senaste aktivitet utan att först ersätta det fokuserade kortets
DOM, så returfokus kan bindas till samma stabila projekt-ID. Tangentbordsgenvägar
är UI-kommandon och passerar aldrig Review Projector, Semantic Document,
Documentation Intelligence, Planner eller Word-adaptern.

## Production boundary assessment 4.5 UX9

Ship review confirms the dependency direction remains intact:

```text
Review → Projector → Semantic Document → Profile/Theme → Planner → Components
                                                     ↘ Intelligence (advisory)
                                                      ↘ Document Workspace
                                                       ↘ Word Adapter

Session metadata → Document Library → Batch command plans
                                      ↘ sequential Word orchestration (one Review)
```

Document Library persistence rejects Review, semantic, plan, renderer, Word and
screenshot payloads. Batch Operations imports only the library model and emits
immutable metadata results or stable-ID plans. Dashboard remains the composition
root; it is the only layer that resolves an explicit batch export reference to
one Review and the unchanged Word pipeline.

`async-operations.js` is UI infrastructure only. It owns timeout timer cleanup
and single-flight request coalescing for popup polling, has no product-domain
dependencies and stores no state after a request settles.

# Architecture 4.4

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

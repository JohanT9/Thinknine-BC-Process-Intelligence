# Review Studio Architecture 4.2

## RC1 foundation

Review Studio skiljer nu mellan bestående reviewdata och transient UI-selection.
Urvalet sparas inte och påverkar inte Word-exporten.

```text
Review task model
       ↓ stable taskId
Selection reducer ← pointer and keyboard commands
       ↓ selection state
Dashboard selection adapter
       ↓
Accessible task list rendering
```

## Selection model

`src/review/review-selection.js` är en browser- och CommonJS-kompatibel modul.
State består av:

```text
selectedIds  valda task-ID:n i dokumentordning
activeId     tangentbordets aktiva steg
anchorId     startpunkt för intervallmarkering
```

Modellen är immutable och erbjuder reducer-kommandon för enkelt val, additivt
val, intervall, navigering, välj alla, rensning och reconciliation när tasklistan
ändras.

## Event handling

Ett delegerat click- och keydown-flöde binds till hela reviewlistan. Nya eller
omrenderade steg behöver därför inga egna selection-lyssnare. Bindningen
översätter DOM-händelser till kommandon och känner inte till dashboardens state.

## Accessibility

Tasklistan använder `role="grid"` och `aria-multiselectable="true"`. Varje
steg använder `role="row"` med gridceller, dynamiskt `aria-selected` och roving
tabindex. Gridsemantiken tillåter att stegkort fortsatt innehåller formulärfält
och åtgärdsknappar.
Mus, Ctrl/Cmd, Shift, piltangenter, Home, End, Enter, Blanksteg och Ctrl/Cmd+A
stöds.

## Boundaries

Domänlogik och återanvändbar eventtolkning ligger i Review-modulerna. Dashboarden
är fortfarande composition root och ansvarar för aktiv session, rendering,
persistence och exportintegration. Denna gräns är accepterad för 4.2; en separat
Review Controller kan införas senare om fler vyer behöver dela orchestration.

## RC2 move engine

`src/review/review-move.js` innehåller de enda operationerna för omordning.
Engine arbetar på stabila task-ID:n och returnerar nya arrays utan att mutera
indata. En selection flyttas i dokumentordning som ett block.

Drag-and-drop-bindningen översätter dragstart, målposition och drop till samma
move-operation som används av flyttknappar och Alt+piltangenter. Bindningen är
delegerad till reviewlistan och returnerar en cleanup-funktion.

Efter en flytt renderas tasklistan om, selection reconcileras med samma ID:n och
aktiv row återfår fokus. FLIP-animation använder elementens position före och
efter renderingen och respekterar `prefers-reduced-motion`.

## RC3 merge engine and history

`src/review/review-merge.js` är den enda implementationen av merge. Den tar en
tasklista och valda ID:n och returnerar en ny lista, en sammanslagen task och en
history entry.

Den sammanslagna tasken behåller den första valda taskens ID och position.
Instruktioner, originalinstruktioner och kommentarer sammanfogas i
dokumentordning. Skärmbilder och source events dedupliceras utan att ordningen
förloras. Källmetadata bevaras både på den sammanslagna tasken och som fulla
task-snapshots i historiken.

```text
review.history[]
├── historyId
├── type: merge
├── createdAt
├── mergedTaskId
├── insertionIndex
└── sourceTasks[]
    ├── original index
    └── complete task snapshot
```

Detta format är en permanent audit trail. Interaktiv Undo/Redo använder den
separata snapshot-baserade `commandHistory` som infördes i RC5.

## RC4 split engine

`src/review/review-split.js` är den enda implementationen av split. Engine kan
antingen dela instruktionstext vid ett teckenindex eller konsumera två eller
flera föreslagna segment.

```text
split specification
├── splitAt                  manuell markörposition
├── segments[]               framtida förslag
│   ├── text
│   └── metadata
└── suggestionSource         manual, ai eller annan provider
```

Källtasken ersätts på sitt ursprungliga index. Första delen behåller källans ID
och efterföljande delar får kollisionssäkra suffix. Alla delar återanvänder
skärmbilder och metadata, men blir explicit redigerade och ej godkända.

Varje split skriver en reversibel history entry med källtaskens fulla snapshot,
ursprungligt index och samtliga skapade task-ID:n. Suggestion-API:t är rent och
har ingen koppling till en viss AI-leverantör.

## RC5 command history

`src/review/review-history.js` är en återanvändbar snapshot-baserad historikmotor.
Review Studio anropar den efter en domänoperation; UI:t behöver därför inte veta
hur Move, Merge, Split, Delete eller Edit återställs.

```text
review.commandHistory[]
├── type, timestamps, metadata
├── beforeTasks / afterTasks
├── beforeSelection / afterSelection
└── beforeStatus / afterStatus

review.historyIndex
├── Undo → återställ before och flytta index bakåt
└── Redo → återställ after och flytta index framåt
```

Nya kommandon efter Undo kapar redo-grenen. No-op-operationer ignoreras och
historiken begränsas till 100 poster. Redigeringar använder en `groupKey` per
task och fält, vilket samlar en följd av input-events till ett enda kommando.

Den befintliga `review.history` för merge/split är fortsatt en permanent audit
trail. `commandHistory` är separat och styr interaktiv Undo/Redo; detta gör att
revisionens händelser inte försvinner när användaren navigerar i kommandostacken.
Tangentbordstolkningen ligger också i historikmotorn och återanvänds av
dashboarden.

## RC6 editing controller

`src/review/review-edit.js` separerar redigeringssessionen från den sparade
reviewmodellen. En session innehåller task-ID, fält, ursprungsvärde och draft.
Modellen ändras först vid commit, vilket gör Escape helt sidoeffektsfri och
skapar exakt en Edit-post i kommandohistoriken.

```text
read-only inline field
  ├── double-click / Enter → begin session
  ├── input                → update draft
  ├── Enter / focusout     → commit → history → autosave
  └── Escape               → cancel → restore original value
```

DOM-händelserna är delegerade från reviewlistan och editmotorn känner inte till
dashboardens modell eller persistence-API. Autosave är en separat debounce-
scheduler med `schedule`, `flush` och `cancel`. Dashboarden skyddar dessutom
mot sena save-svar genom att bara ersätta den aktiva modellen om dess
`updatedAt` fortfarande matchar den snapshot som skickades.

När ett fält är i editläge lämnas Ctrl/Cmd+Z till webbläsarens native
textredigering. Efter commit hanteras Undo/Redo åter av RC5-motorn.

## RC7 toolbar state

`src/review/review-toolbar.js` är presentationens enda definition av toolbarens
kommandon och deras enabled-state. `derive` är en ren funktion som tar task-ID:n,
selection, historikflaggor och exportberedskap. Dashboarden applicerar resultatet
efter varje render, selection-ändring och historikoperation.

```text
Review state + Selection + History + Export readiness
                         │
                         ▼
              review-toolbar.derive()
                         │
            undo / redo / merge / split
              move-up / move-down / export
```

Toolbarens click- och keyboard-events är delegerade. Dashboarden ansvarar endast
för att routa ett kommando till befintliga Move, Merge, Split, History och Export
API:er. Delete är en kontextuell åtgärd på varje steg och använder fortfarande
den ID-baserade operationen i `review-studio.js` med en snapshot-baserad
Undo-post.

## RC8 status model

`src/review/review-status.js` härleder fyra värden utan beroende till DOM eller
dashboard-state: aktiva steg, giltigt valda steg, skärmbildsplaceringar och
uppskattade sidor. Samma `applyReviewSelection`-flöde som driver toolbar-state
applicerar statusen, vilket gör uppdateringen automatisk efter både rena
selection-events och omrenderande domänkommandon.

Sidestimatet är avsiktligt enkelt och deterministiskt:

```text
0 steg: 0 sidor
annars: max(2, ceil(1.5 + steg × 0.25 + skärmbilder × 0.75))
```

Det är ett UX-estimat, inte en pagineringsgaranti från Word. Skärmbildslistor
dedupliceras per steg på samma sätt som exportören. Statusens DOM använder en
`dl` inuti en `role=status`-region med `aria-live=polite` och `aria-atomic=true`.

## RC9 accessibility layer

`src/review/review-accessibility.js` kapslar dialogens fokusregler och är
oberoende av Review-modellen. Den identifierar aktiva fokuskontroller, cyklar
Tab/Shift+Tab vid dialoggränserna och hanterar Escape. Events som redan har
hanterats av inline-editorn lämnas orörda, vilket förhindrar att Escape både
avbryter redigering och stänger dialogen.

```text
opener focus
    │ open
    ▼
modal dialog → close button → toolbar → grid controls → footer
    ▲                                               │
    └────────────── Tab focus loop ─────────────────┘
    │ close / Escape
    ▼
opener focus restored
```

Dialogen använder `role=dialog`, `aria-modal`, `aria-labelledby` och
`aria-describedby`. Gridens befintliga row/gridcell-semantik kompletteras med
`aria-rowcount`, `aria-rowindex`, stabila labels och skärmläsarinstruktioner.
Progress och save-status använder sina respektive ARIA-statusmönster. Detta
lager ändrar inte domänkommandon, selection eller persistence.

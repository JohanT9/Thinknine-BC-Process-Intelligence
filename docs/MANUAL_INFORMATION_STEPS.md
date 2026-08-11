# Manual Information Steps

Manual Steps participate normally in Section/Subtask ownership and ordering while
retaining manual provenance and empty captured-event traceability.

Manual Steps may own supplementary Notes and may reference annotated screenshots.
Neither relationship fabricates captured-event traceability.

## Purpose and architecture

Manual Information Steps are consultant-authored documentation objects. They
allow explanations, prerequisites, warnings, tips, verification, and missing
procedural instructions without fabricating recorder activity:

`Generated Steps + Manual Steps + Structure Overrides + Content Overrides -> Resolved Steps`

They live only in Review/documentation state. Canonical Recording, raw events,
identification, normalization, Step Groups, semantic actions, and screenshot
assets remain unchanged.

## Model and provenance

Schema `1.0.0` stores `manualStepId`, `recordingId`, type, stable position
anchor, title, instruction, comment, optional callout, optional screenshot asset
reference, visibility, timestamps, creator, metadata, and preserved future
fields. Provenance is always `manual`, and information-only steps have
`sourceEventIds: []`. No fake event IDs are generated.

Supported types are `instruction`, `information` (default), `note`, `warning`,
`tip`, `verification`, and `prerequisite`. The taxonomy represents intent rather
than renderer styling.

## Insertion and anchors

Placement uses `before`, `after`, `section-start`, or `section-end` anchors with
stable target step and section IDs. It never persists array index as identity.
When a target disappears, content is preserved, the anchor is diagnosed as
unresolved, and placement falls back deterministically to the same section end.
No neighbouring step is guessed.

## Editing, callouts, and authoritative text

Manual Steps project into the ordinary Resolved Step contract and use the same
Review editor, selection, movement, history, autosave, and document pipeline.
Manual prose is authoritative. Semantic Interaction Rules and Language
Excellence do not rewrite it; presentation may render only explicit formatting.

Callouts use existing semantic roles. Empty manual objects fail model validation;
the Review insertion action supplies editable initial content so an invisible
step is not silently saved.

## Screenshots and annotations

A screenshot is optional. Selection references an existing recording asset and
never copies bytes or invents event traceability. Existing annotations remain
owned by that asset; they are not copied or migrated.

## Hide, delete, move, merge, and split

Hide changes visibility while preserving the Manual Step object. Delete removes
the documentation object but is fully Undoable. Neither operation affects
recorded evidence.

Movement updates a stable anchor relative to the preceding recorded step or the
section start. Merge remains a Structure Override: manual identity and
documentation provenance coexist with canonical event references from any
recorded portion. Manual-plus-manual merge has no captured event IDs.

Manual split creates resolved parts with deterministic structural IDs and
`originalManualStepId`; parts retain empty source-event lists rather than
pretending to partition recorder evidence.

## Regeneration and persistence

Manual content survives normalization, grouping, semantic, language, and
screenshot regeneration because it is stored independently. Existing Review
autosave and its serialized queue persist Manual Steps, and pending changes flush
before export. Existing Reviews without `manualSteps` need no migration and
produce unchanged output.

## Renderer parity and privacy

Manual Steps resolve before semantic-document projection. Documentation
Intelligence, Planner, Workspace, and Word consume the same Resolved Step; Word
does not expose manual provenance or use a special renderer. Manual text remains
local, is not emitted to production diagnostics, and uses no AI, network, or
external service.

## Process projection

Prerequisites and information become information nodes; explicit instructions
become activities. Verification requires an explicit procedural marker, while
warnings, notes, and tips stay documentation context. Manual projections retain
manual provenance and no fabricated Event references. See
[PROCESS_MODEL.md](PROCESS_MODEL.md).

## Regeneration

Manual Information Steps always survive because they are not recording-derived.
Anchors retarget through unique Step identity; missing targets retain the existing
conservative fallback/orphan behavior. See
[REGENERATE_FROM_RECORDING.md](REGENERATE_FROM_RECORDING.md).

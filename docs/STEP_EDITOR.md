# Step Editor

Step content remains independently editable after hierarchy assignment. Hierarchy
titles and ownership are separate from sparse Step content overrides.

The editor hierarchy keeps instruction, screenshot/annotations, and Notes distinct.
User-authored note text is authoritative and uses the existing Review history.

Manual Steps reuse the normal content editing surface. Their text is authoritative,
their screenshots are optional references, and their provenance remains manual.

Structure Overrides apply before Step Content Overrides. Content edits on stable
resolved identities remain sparse; Reset Structure retains safely matchable
content edits and preserves unmatched edits as orphan metadata.

## Purpose and architecture

The Step Editor lets consultants refine generated documentation without changing
canonical recording evidence:

`Derived Step + sparse Step Override -> Resolved Step -> Document pipeline`

Canonical events, normalized events, Step Groups, semantic actions, screenshot
assets, and annotation ownership are never mutated by editing.

## Override storage contract

Step Overrides use schema version `1.0.0` and contain `overrideId`, stable
`stepId`, `recordingId`, canonical `sourceEventIds`, timestamps, editor identity,
sparse `fields`, optional `screenshotOverride`, optional `visibilityOverride`,
metadata, and preserved future fields. Identity never uses array position.

Editable fields are title, instruction, comment, selected screenshot, and
visibility. Only explicit changes are persisted. Unknown extension properties
and `futureFields` survive normalization.

## Resolution, provenance, and regeneration

Resolution is deterministic. A field comes from the override only when it is
explicitly present; otherwise it comes from the latest Derived Step. Provenance
distinguishes `generated`, `system-derived`, and `user-edited`. Free-text user
instructions are authoritative formatted text and are not rewritten by Semantic
Interaction Rules or Language Excellence after save.

Untouched generated fields therefore improve after regeneration while explicit
edits survive. Reset removes one sparse property and reveals the latest generated
value.

## Screenshots, annotations, and visibility

The editor lists only screenshot assets associated with the step. Manual choice
stores only `selectedScreenshotAssetId`; bytes are not copied and automatic
candidates remain available. Annotated screenshots cannot be replaced silently,
and annotation ownership is never moved or inferred.

Hide is a Review override (`visibilityOverride: hidden`), not evidence deletion.
The Resolved Step is excluded from Workspace and Word while raw evidence remains.

## History, autosave, and conflicts

Edits use existing Review command history, Undo/Redo shortcuts, autosave, and the
serialized persistence queue. Pending saves flush before export. Persistence
failures are announced and never reported as saved. Active drafts remain local
until commit, so a refreshed projection cannot replace typed text.

## Orphans and legacy compatibility

Overrides without a matching stable step ID are preserved in
`orphanedStepOverrides` for diagnostics. They are never discarded or attached by
position. Recovery UI remains future work.

Existing Reviews need no destructive migration. In-memory normalization projects
instructions differing from `originalInstruction` and existing comments into
sparse overrides.

## Renderer parity, performance, and privacy

The Review Document Projector resolves overrides before creating the Semantic
Document. Workspace, Documentation Intelligence, Planner, and Word consume this
same projection; Word has no special override logic.

Resolution is linear and metadata-only. Editing does not normalize or regroup
recording evidence, inspect image bytes, invoke Word, call external services, or
use AI.

## Regeneration

Sparse explicit fields retarget only through unique identity/evidence mappings.
Edited fields survive; reset or untouched fields receive new generated values.
Ambiguous split/consolidation targets remain unresolved. See
[REGENERATE_FROM_RECORDING.md](REGENERATE_FROM_RECORDING.md).

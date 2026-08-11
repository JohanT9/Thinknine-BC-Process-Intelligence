# Sections and Subtasks

## Philosophy and bounded hierarchy

Documentation hierarchy is presentation state above resolved steps:

`Document -> Section -> optional Subtask -> Step`

No deeper nesting is supported. Sections/Subtasks never change Canonical
Recording, recorded chronology, Step Groups, Semantic Actions, screenshots,
Notes, or Annotations.

## Models and provenance

Section and Subtask schema `1.0.0` objects have stable IDs, recording ID, title,
description, position metadata, source step aggregation, visibility, provenance,
timestamps, metadata, and preserved future fields. A Section tracks direct steps
and Subtasks; a Subtask tracks its steps and owning Section.

Provenance is `generated`, `manual`, or `user-adjusted`. Generated hierarchy is
permitted only from strong deterministic boundaries. This milestone does not
infer hierarchy from caption similarity. Manual titles are authoritative and
bypass automatic rewriting.

## Ownership and traceability

Every assigned visible Step belongs to exactly one Section and at most one
Subtask. Duplicate ownership is rejected/diagnosed. Section/Subtask event
traceability is aggregated from contained resolved Steps; headings never receive
invented event IDs.

`recordedOrder` retains capture chronology. `presentationOrder` records the
consultant's document organization. Moving hierarchy never claims to change
recorded history.

## Overrides and editing

Sparse Hierarchy Overrides record create-section, create-subtask, rename, move,
reorder, and reset intent with stable targets. Review exposes selection-based
Section/Subtask creation, hierarchy navigation summary, reset, and existing
keyboard-capable step movement. Collapse state, when used, is UI state only.

Empty hierarchy objects remain editable state but are omitted from resolved
exports. Sections containing only hidden steps are also omitted.

## Structural integration

Hide filters visible steps without deleting hierarchy. Merge inside one hierarchy
location inherits that location. Cross-Section/Subtask merge is rejected until
the consultant makes an explicit move. Split parts inherit the parent's location
and adjacent presentation position.

Manual Information Steps participate like recorded Steps without event IDs.
Step Notes stay on stable Step identities. Screenshot Annotations remain on
their screenshot assets, so hierarchy movement cannot alter geometry or ownership.

## Regeneration, reset, and orphans

Manual hierarchy persists while stable Step/Section/Subtask identities resolve.
User-adjusted titles override regenerated titles; untouched generated fields may
improve. Missing targets and assignments are preserved as overrides and reported
through diagnostics—never guessed by array position.

Reset Hierarchy removes manual hierarchy organization and returns to the latest
flat/generated structure without resetting content, Notes, Annotations, manual
steps, or structural edits.

## Persistence, rendering, and accessibility

Hierarchy uses existing Review history, autosave, serialized persistence, and
pre-export flush. Undo/Redo restores hierarchy objects and overrides with the
existing command stack.

The Review Projector emits semantic Section level-2 and Subtask level-3 headings
around ordinary Step blocks. Planner, Workspace, and Word consume the same
Semantic Document and plan. Empty headings are not exported.

Review navigation exposes semantic list structure and accessible names; toolbar
actions provide keyboard alternatives to drag/drop. Existing focus, high
contrast, reduced motion, and live announcements remain applicable.

Hierarchy resolution is linear for normal assignments and metadata-only. It does
not rerun recording, normalization, grouping, semantic rules, screenshot
selection, or Word rendering, and it uses no AI or external services.

## Process Model mapping

Sections project as phase containers, never executable activities. Multi-step
Subtasks may become bounded subprocesses; one-step Subtasks are not over-modeled.
Recorded and presentation order remain intact when separate process order is
defined. See [PROCESS_MODEL.md](PROCESS_MODEL.md).

## Versioning relationship

Process Version snapshots capture resolved process containment at creation time.
A later Section/Subtask edit affects only the current Process Model until another
intentional version is created; movement between process containers is then
reported structurally. See [PROCESS_VERSIONING.md](PROCESS_VERSIONING.md).

## Regeneration

Generated hierarchy may improve, while manual Sections, Subtasks, titles, and
placements remain authoritative. Assignments retarget only through unique Step
mappings; unsafe ownership remains unresolved. See
[REGENERATE_FROM_RECORDING.md](REGENERATE_FROM_RECORDING.md).

# Step Structure Overrides

Structure Overrides resolve step shape before hierarchy assignment. Merge must
stay inside one hierarchy location; split parts inherit their parent's location.

Structure resolution preserves source note identities and screenshot annotation
ownership. Merge never concatenates notes; split never guesses ownership.

Manual Steps are anchor-resolved before Structure Overrides, allowing adjacent
manual/recorded merge and manual split without assigning recorded evidence to
manual content. Structural results retain both evidence and documentation provenance.

## Purpose and pipeline

Consultants can hide, merge, or split documentation steps without modifying
canonical evidence or generated Step Groups:

`Generated Steps + Structure Overrides -> Resolved Structure + Content Overrides -> Resolved Steps`

Structure resolution precedes sparse content resolution. Language, presentation,
screenshot selection, Workspace, and Word consume the result and do not own
structural policy.

## Storage contract

Schema `1.0.0` stores `structureOverrideId`, `recordingId`, `type`, ordered
`sourceStepIds`, ordered `sourceEventIds`, timestamps, sequence, metadata,
partitions for split, and preserved future fields. IDs use stable source identity,
override identity, and partition identity—never array position.

## Hide

Hide removes a step only from resolved document presentation. The override keeps
its step and event references. Raw events, Step Groups, screenshots, and
annotations remain. Show Again, Undo, or Reset Structure restores the latest
generated step.

## Merge

Only adjacent selected steps can merge. The override preserves source ordering,
all step/event/screenshot references, and annotation ownership. Its resolved ID
is a deterministic fingerprint of override and ordered source step IDs. Existing
explicit instruction content wins; otherwise source content provides a safe
initial instruction that remains editable.

Merge logic does not choose a screenshot. It exposes the combined candidate set
to Screenshot Selection, and manual selection remains authoritative.

## Split

Split partitions one source step's event IDs for presentation. Each event must be
assigned exactly once; duplicate or missing ownership is rejected. Part IDs are
deterministic fingerprints of override identity, source step ID, and partition
ID. Screenshot associations restrict candidates where event-level relationships
exist; otherwise candidates are conservatively preserved. Annotation ownership
is never moved or deleted.

## Regeneration, conflicts, and orphans

Overrides reapply when their stable source identities still resolve. Improved
source content flows into untouched fields. Missing source steps, changed event
partitions, non-adjacent merge sources, or unsafe conflicts produce preserved
orphan/unresolved diagnostics rather than positional reassignment.

Content overrides apply after structure. Reset Structure removes structure
overrides while retaining content overrides that still match stable generated
steps. Unmatchable content overrides are preserved as orphan metadata.

## History, persistence, and compatibility

The existing Review command history snapshots structure overrides together with
the compatibility task projection, so Undo/Redo restores both. Existing Review
autosave and export flushing persist the model; no separate storage system is
introduced.

Legacy Reviews need no destructive migration. Their task array remains a
compatibility projection, and the original generated structure is captured when
the first structural edit is made.

## Renderer parity and safety

Documentation Intelligence analyzes visible resolved structure. Workspace and
Word share the same Semantic Document and Document Plan; neither contains
special hide/merge/split logic. Operations are metadata-only, local, reversible,
and do not use AI or external services.

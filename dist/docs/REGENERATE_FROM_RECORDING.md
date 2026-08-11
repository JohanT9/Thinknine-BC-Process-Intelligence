# Regenerate From Recording

## Purpose and safety boundary

Regeneration reinterprets immutable Canonical Recording evidence with the
current deterministic pipeline. It generates fresh derived objects, reconciles
explicit consultant state, validates the complete candidate, and only then
offers an atomic apply. It never edits current generated objects in place.

```text
Canonical Recording → current interpretation pipeline → fresh generated state
                                                        + consultant state
                                                               ↓
                                                        reconciliation
                                                               ↓
                                             preview / validated commit payload
```

Canonical Recording, historical Process Versions, rendered Workspace state,
Word output, DOM, and edited instruction text are never interpretation inputs.
No regeneration occurs automatically on startup.

## Generated and user-authored state

Generated state includes identification, normalized events, Step Groups,
Semantic Actions, generated Steps, automatic screenshot selection, generated
hierarchy, and current Process Model projection. Language and presentation
stages participate through their existing pipeline owners.

Authoritative consultant state includes sparse Step edits, manual screenshot
choices, Hide/Merge/Split, Manual Information Steps and anchors, Notes,
Annotations, Sections/Subtasks and assignments, and Process Overrides. It is
reconciliation input only and is never fed back into evidence interpretation.

## Derived Revision and pipeline versions

A Derived Revision identifies one complete generated interpretation, not a
user-created Process Version. Schema/orchestration version `1.0.0` records
recording identity, creation time, semantic/Step/Process fingerprints, metadata,
and independent versions for identification, normalization, grouping, semantic
rules, language, presentation grammar, screenshot selection, hierarchy
projection, and Process Model projection.

Identity is deterministic over recording identity, generated semantics, and
component versions. `regenerationAvailable()` compares stored and available
component versions but never triggers regeneration automatically.

## Fresh generation and reconciliation

The caller injects the existing current interpretation pipeline. It receives a
detached Canonical Recording clone, runs once, and returns fresh generated state.
The orchestrator verifies the original recording remains structurally identical.

Step matching uses this bounded order:

1. stable Step ID;
2. unique Step Group ID;
3. unique Semantic Action identity;
4. identical canonical Event set;
5. exact Event partition/consolidation analysis.

It never matches by position, wording, localized caption, screenshot proximity,
or timestamp. Partial overlap only produces possible targets and remains
unresolved.

One-to-one mappings retarget applicable sparse state field by field. Untouched
generated fields adopt new values while explicit instruction/comment fields stay
authoritative. Reset-to-generated fields have no override and therefore improve
naturally.

Exact one-to-many Event partitions and many-to-one consolidations are reported
as structured mappings. Content overrides are not duplicated or concatenated;
they become unresolved unless ownership is deterministic. Split partitions are
preserved only while their canonical Event evidence remains compatible.

## Manual-state preservation

Manual screenshot choices survive if their asset still exists. A missing asset
creates an unresolved manual-screenshot record while the new automatic choice
remains a separate recommendation. Annotations remain attached to their stable
screenshot assets and are never migrated to another image.

Hide and Merge survive when every target maps uniquely. Split survives through
its Event partitions. Unsafe structure is preserved as an unresolved record and
is never recreated against arbitrary Steps.

Manual Information Steps always survive. Stable anchors are retargeted; missing
anchors remain for the existing conservative fallback/orphan policy. Notes map
to a unique owner or become explicit orphans. Screenshot-owned annotation state
is copied unchanged. Manual Sections/Subtasks remain, and assignments retarget
only on unique Step mappings.

Process Model is freshly projected by the injected pipeline. Process Overrides
retarget through old-node → stable source Step → new-node identity; manual nodes
without generated targets retain manual identity. Unsafe overrides remain
unresolved. Historical Process Version snapshots never change, and regeneration
never creates a Process Version. A semantic Process Diff indicates whether the
current regenerated process differs.

## Result, change set, and unresolved state

The immutable Regeneration Result records source/current revisions, timings,
status, generated change counts, preserved/unresolved overrides, warnings,
diagnostics, and future fields. Its structured change set includes added,
removed, and changed generated Steps; split/merge mappings; ambiguous mappings;
manual item counts; hierarchy/screenshot placeholders; and Process Diff.

Every unresolved item retains stable identity, type, original target,
traceability, reason, deterministic possible targets, and status. Nothing is
silently discarded or automatically guessed. Diagnostics contain identities and
reasons rather than sensitive business text.

## Dry run, apply, atomicity, and rollback

`prepare({dryRun:true})` performs generation, reconciliation, Process comparison,
and validation without persistence. Apply requires an atomic commit adapter and
passes the expected previous revision, next revision, complete resolved project,
and unresolved state as one payload. A failed validation or commit leaves the
previous active revision pointer unchanged. Canonical Recording needs no rollback
because it was never modified.

Validation covers generated identity uniqueness, Process Model validity,
explicit unresolved tracking, and historical-version immutability. Storage
adapters may add screenshot, annotation, hierarchy, and persistence-specific
checks before committing.

## Integrations

After a successful commit, Workspace and Word consume the same active resolved
project. Workspace Context preserves a selected Step only through a unique
mapping; otherwise selection clears with a screen-reader-friendly announcement.
Word has no regeneration logic and must await the active-project commit.

Documentation Intelligence analyzes the new resolved document and can advise on
unresolved consultant state. The Document Library stores only derived revision
ID/date, orchestration and bounded pipeline version, process-change indicator,
and unresolved count. Full generated revisions/results remain outside library
metadata.

## Legacy evidence, performance, privacy, and limitations

Legacy recordings can regenerate through the existing canonical adapter with
available evidence. Regeneration cannot recover screenshots, frames, unmasked
values, or interactions never captured. Reinterpretation is not reconstruction.

Map-based matching is linear or near-linear for normal recordings and has a
5,000-Step regression. Regeneration does not load screenshot bytes, access DOM,
render Word, call external services, upload data, or use AI.

This milestone provides model/API preview and commit contracts, not a graphical
preview, startup trigger, arbitrary Derived Revision history, persistence engine,
or new regeneration button. Future UI must provide keyboard invocation, explicit
explanation, semantic change/unresolved summaries, focus restoration, high
contrast, reduced-motion compatibility, and non-colour status communication.

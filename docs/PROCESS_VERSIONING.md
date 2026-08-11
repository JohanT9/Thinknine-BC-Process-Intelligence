# Process Versioning

## Purpose and boundary

Process Versioning preserves intentional historical states of the semantic
Process Model and compares them without consulting renderer output. It is above
Process Model projection and independent of Canonical Recording, Review,
Workspace, Word, diagrams, and UI state.

```text
Current Process Model ── explicit snapshot ──> immutable Process Version history
          │                                      │
          └──────────── semantic comparison ─────┘
                              ↓
                    renderer-neutral Process Diff
```

No version is created for a keystroke or autosave. A consultant explicitly
creates a baseline or subsequent version. Historical snapshots are never
rewritten, even when upstream rules or the Process Model projector change.

## Process Version model and snapshot strategy

Version schema `1.0.0` stores a complete deep-frozen Process Model snapshot. An
old version therefore needs no replay of current recording, hierarchy, override,
or projector state. It retains version/model/recording identity, human-readable
version number, explicit sequence, parent, timestamps, author, creation reason,
notes, status, baseline flag, source revisions, semantic fingerprint, provenance,
metadata, and future fields.

IDs are deterministic hashes of process identity, semantic fingerprint, parent,
explicit sequence, and version label. Labels use `major.minor`, such as `1.0` or
`1.1`. Major significance is never guessed: callers choose the label. Parent
references are explicit and need not mean the numerically previous label.

Supported status metadata is `draft`, `review`, `approved`, or `superseded`.
Baseline designation changes no snapshot content. Creation provenance is
`manual-snapshot`, `generated-baseline`, `imported`, or `regenerated`; approval
status and provenance remain separate.

## Semantic fingerprint

The deterministic fingerprint includes nodes, semantic node fields, transitions,
containment, process order, boundaries, manual process content, provenance, and
stable traceability. It excludes timestamps, screenshot/annotation state, themes,
layout, renderer/UI fields, and generated documentation wording. Manual or
user-adjusted semantic titles remain meaningful.

An attempted snapshot equal to the latest semantic fingerprint returns
`identical-semantic-snapshot` and a calm “No process changes” result. A caller may
explicitly allow a metadata-only snapshot. Cache state is never authoritative.

## Process Diff model

Diff schema and algorithm versions are `1.0.0`. A deterministic diff contains
from/to identities, node, transition, container and metadata changes, structured
counts, a deterministic non-AI summary, and future fields.

Node changes use `added`, `removed`, `modified`, `moved`, and `unchanged`.
Transition changes use `transition-added`, `transition-removed`,
`transition-modified`, and `unchanged`. Containers use `added`, `removed`,
`container-changed`, and `unchanged`. Categories are qualitative—`structural`,
`content`, and `flow`—and make no claim about business impact.

Stable node ID is the primary match. If projector evolution changes it, a node
may match conservatively through a unique exact combination of Step, Semantic
Action, and canonical Event references. Titles are never fuzzy-matched. Movement
means the stable node changed process order, container, Section, or Subtask; it is
not represented as removal plus addition.

Transitions first match by identity, then by uniquely mapped endpoints. Type,
condition, label, provenance, or semantic metadata changes are explicit. Storage
array order is irrelevant. Thus inserting Approval between Quantity and Release
reports Approval added, Quantity→Release removed, and two transitions added.
Decision and branch changes are ordinary typed node/transition changes and are
never judged or inferred.

Generated wording-only changes do not produce semantic node changes. Screenshot
selection, annotation geometry, theme, pagination, Word layout, and diagram
coordinates never produce Process Diffs. Manual Process Override effects and
their provenance are preserved in the frozen snapshot.

## Comparison, baseline, and history

`compareProcessVersions` supports historical-to-historical and historical-to-
current comparison; a current Process Model receives a transient deterministic
comparison identity. `compareCurrentToBaseline` selects the latest explicitly
baseline or approved version and does not require a new snapshot. `history`
sorts by explicit version sequence and time, not parsed label chronology.

Read-only historical inspection is supported. Restore does not overwrite
Canonical Recording; any future restore must create new current override state.

## Persistence and integrations

The models are storage-agnostic. Full versions belong in a separate conceptual
`processVersionsByProcess` store. A diff may be recomputed; any optional cache is
keyed by from/to/diff version and is never source of truth.

Document Library accepts only current version/ID, count, baseline/approved
version/ID, and last process-change date. It explicitly strips full snapshots,
version collections, and diff caches. Documentation Intelligence can advise that
current state differs from a baseline without blocking changes or inventing
impact. Existing Workspace and Word behavior and output remain unchanged.

## Traceability, performance, privacy, and evolution

Each frozen historical node retains the Step, Semantic Action, and canonical
Event references present at creation. Future regeneration cannot alter them.
Deep navigation to externally deleted evidence may become unavailable under a
future retention policy, but snapshot semantics and stored references survive.

Matching and comparison are near-linear with stable identities, avoid all-pairs
title similarity, and have a 5,000-node regression. There is no DOM, image load,
document generation, network, upload, AI interpretation, or snapshot logging.
Unknown future fields are preserved through central normalization.

No graphical or colour-based diff UI, approval workflow, branching version
management, destructive restore, or visual renderer is implemented. The
structured model is ready for an accessible future history or visual diff view.

## Regeneration interaction

Regeneration creates a Derived Revision, never a Process Version. Historical
snapshots remain byte/structure equivalent. Current regenerated Process Model
may be compared with the baseline so the consultant can explicitly version it
later. See [REGENERATE_FROM_RECORDING.md](REGENERATE_FROM_RECORDING.md).

# Event â†’ Step Grouping

Review merge, split, movement, visibility, and overrides affect document
structure only. They never rewrite Step Groups or source links.

## Purpose and architecture

Sections/Subtasks consume resolved Step identities after grouping. Moving a Step
in documentation never rewrites its Step Group or canonical chronology.

Manual Steps do not enter Event-to-Step Grouping. They are inserted later through
stable documentation anchors and therefore cannot rewrite generated groups.

Manual Structure Overrides layer above this generated grouping. Merge does not
combine Step Groups, and Split partitions presentation rather than evidence.

Step Grouping converts ordered normalized mechanics into candidate documentation
step boundaries:

```text
Normalized Interaction Events -> Step Groups -> Semantic Interaction Rules
```

It does not interpret customer, item, posting, or other business meaning; write
instructions; format text; inspect images; or select screenshots. Outputs are
immutable derived data and never modify canonical or normalized evidence.

## Model, version, and identity

Schema-v1 Step Groups contain recording and deterministic group IDs, grouping
version, all canonical and normalized source IDs, start/end timestamp, sequence,
primary event, page/control/action context, structural group kind, explicit
reasons, all screenshot candidates, frame contexts, supporting IDs, evidence,
candidate status, and an additive immutable `capturePacket`. Unknown future
fields survive normalization.

The capture packet explicitly relates the observed interaction to its immediate
verified result and captured screenshot evidence. It records interaction and
result event IDs separately, all screenshot asset IDs, the source event owning
the latest result capture, completeness (`complete` or `partial`), and any
missing role. It is derived evidence: Canonical Recording and raw events remain
unchanged.

Algorithm version is `1.0.0`. IDs use the version plus collision-safe,
length-prefixed canonical source IDs. They do not use random values, execution
time, Review order, export state, or captions.

## Boundaries and group kinds

The structural kinds are `field-edit`, `lookup-interaction`, `selection`,
`toggle-interaction`, `action`, `navigation`, `dialog-interaction`,
`row-interaction`, and `unknown`.

Navigation and dialog mechanics normally remain boundaries. When they are the
immediate observed result of a captioned action, they complete that action's
capture packet instead of creating a duplicate step. Repeated activations of
the same identified action/control may be coalesced only inside a bounded
1.2-second interaction window. Timing is never sufficient without matching page
and action/control identity. Page identity changes, unrelated controls, and
uncertain relationships remain boundaries; ambiguity produces smaller groups.

## Field editing, dates, toggles, and selection

Consecutive value changes remain one field edit only while page/control identity
continues and no completed edit is followed by a new input lifecycle. Intermediate
values remain supporting events; the final committed event is primary. This
groups Quantity `5`/`50`/`500` without merging a later edit from `100` to `500`.

Option selection plus the resulting same-control value update forms one
selection group. Verified checkbox mechanics form toggle groups. Date picker
open, selected date, and resulting same-control ISO value can form a lookup-style
interaction when identities and values verify the relationship.

## Lookups, frames, and ambiguity

A lookup group may contain its identified origin, modal search/filter mechanics,
row selection, and resulting origin-control value. The final merge requires the
same stable origin identity and exact selected/result value. Search inside the
modal is supporting; an unrelated list filter is not swallowed.

Cross-frame grouping follows those identities and values, never timing alone.
A top-frame control, iframe row, and top-frame result can therefore group safely.
An abandoned lookup remains a bounded lookup interaction without fabricated
selection. Unverified result relationships remain separate groups.

## Primary/supporting events, screenshots, and diagnostics

The final committed value, toggle, selection, row, dialog action, or standalone
navigation mechanic is primary. For an action packet with an observed result,
the user's activation remains primary while the navigation/dialog/value result
is explicitly recorded as outcome evidence. Earlier mechanics remain supporting
and retain full traceability. Screenshot asset IDs are aggregated uniquely in
stable source order. The packet identifies the latest result-bearing capture as
its preferred evidence, but final document screenshot ranking remains owned by
Screenshot Intelligence.

Focus transitions and scroll/pointer-movement noise are explicitly classified
as supporting/noise and create no group. Unknown normalized mechanics without a
documentable interaction are classified as supporting/unclassified. They remain
traceable but cannot create an `Unclassified` placeholder step. Every normalized
event is assigned to a group or an explicit supporting classification.
Diagnostics report input count, assignment count, supporting classification,
and any unassigned meaningful IDs. Values are not duplicated in grouping
explanations.

## Semantic integration, compatibility, and performance

Step Grouping owns all mechanical lookup boundaries: identified lookup
activation, supporting modal mechanics, row/option selection, matching resulting
field value, focus/commit boundaries, and abandonment/ambiguity termination. Its
handoff contains `kind`, `targetControl`, `selectedValue`, ordered normalized
events, and every `sourceEventId`. Semantic Interaction Rules process each group
independently and cannot rediscover or consume adjacent mechanical groups.

The temporary compatibility path for older Review/document inputs without Step
Groups still performs legacy adjacent lookup/focus/result consumption. It is not
used by `processStepGroups` and can be removed when ungrouped historical input
is retired.

The session read contract exposes Step Groups and attaches them to detached
compatibility events/tasks. Semantic Interaction Rules provide a dedicated Step
Group adapter and retain group/source identity. Legacy low-level task
consolidation remains only for older Review input without groups. No persistence
migration is required.

Grouping is a cached linear state machine with no DOM, pixel, AI, OCR, language,
network, or all-pairs work. A 5,000-event regression guards performance and event
ownership.

Step Groups aggregate all valid screenshot asset IDs in source order. The
Screenshot Selection Engine consumes that bounded set after semantic and
presentation processing. Grouping never ranks or selects candidates.

## Process projection

Activities reference resolved Steps and their Semantic Action, Step Group, and
canonical Event identities. Process order is separate from grouping chronology;
the Process Model never rewrites or regroups events. See
[PROCESS_MODEL.md](PROCESS_MODEL.md).

## Regeneration reconciliation

Fresh Step Groups may change Step boundaries. Reconciliation prefers stable
Group identity, then exact semantic/Event evidence; exact partitions and
consolidations are reported, while ambiguous overrides remain unresolved. See
[REGENERATE_FROM_RECORDING.md](REGENERATE_FROM_RECORDING.md).

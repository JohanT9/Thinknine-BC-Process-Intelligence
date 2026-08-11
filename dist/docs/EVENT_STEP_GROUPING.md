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
and candidate status. Unknown future fields survive normalization.

Algorithm version is `1.0.0`. IDs use the version plus collision-safe,
length-prefixed canonical source IDs. They do not use random values, execution
time, Review order, export state, or captions.

## Boundaries and group kinds

The structural kinds are `field-edit`, `lookup-interaction`, `selection`,
`toggle-interaction`, `action`, `navigation`, `dialog-interaction`,
`row-interaction`, and `unknown`.

Navigation, committed action/dialog mechanics, page identity changes, unrelated
controls, and uncertain relationships are boundaries. Timing is not used as the
sole reason to merge. Ambiguity produces smaller groups.

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

The final committed value, toggle, selection, row, action, dialog action, or
navigation mechanic is primary. Earlier mechanics remain supporting and retain
full traceability. Screenshot asset IDs are aggregated uniquely in stable source
order; no screenshot is selected.

Focus transitions and scroll/pointer-movement noise are explicitly classified
as supporting/noise and create no group. Every other normalized event is assigned
to exactly one group. Diagnostics report input count, assignment count, supporting
classification, and any unassigned meaningful IDs. Values are not duplicated in
grouping explanations.

## Semantic integration, compatibility, and performance

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

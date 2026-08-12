# Event Normalization

## Boundary and version

Event Normalization 2.0.0 converts persisted browser mechanics plus BC UI
Identification into deterministic, renderer-neutral interactions:

```text
Raw Event Persistence -> BC UI Identification -> Event Normalization
```

It is an immutable in-memory projection. Raw Events, Canonical Recording,
identification, screenshots, Review, and document data are never replaced or
modified. Dashboard receives normalized results from the background read
contract and does not perform normalization.

## Stable taxonomy

The deliberately small vocabulary is:

- `activation`
- `value-change`
- `selection-change`
- `toggle-change`
- `navigation`
- `dialog-open`
- `dialog-close`
- `key-command`
- `unknown`

Focus lifecycle is supporting evidence only and creates no meaningful normalized
event by itself. Browser event names remain in `rawEventType` for traceability,
not as semantic meaning.

## Traceability

Every normalized event carries a deterministic `normalizedEventId`, all
contributing `sourceEventIds`, recording ID, normalization version, timestamp
range, sequence, Page/Control/Action identity, complete frame context, previous
and committed values, state/selection, coordinates, screenshot references,
evidence, source provenance, and retained future metadata. IDs use a
length-prefixed composition of source IDs and do not depend on localized text.

## Native commits and React/MUI fallback

Native input/change evidence is preferred. Consecutive input values such as
`5`, `50`, and `500` remain raw evidence but normalize to one committed
`value-change`. A matching change or focusout joins the same normalized event;
all source IDs remain attached and the final source owns end timestamp/sequence.

Capture also tracks a safe focus session for input, textarea, select, and
contenteditable elements. It records the initial observable value at focus-in
and the final observable value at focusout. If a React/MUI or control-add-in DOM
value changed without a reliable native event, differing initial/final values
produce one fallback `value-change` with
`changed-value-on-focusout-fallback` evidence. Equal values or focus movement
alone produce no meaningful normalized event. A focusout lacking an initial
value does not invent a change.

Native and fallback events for the same identified control coalesce only within
the current focus/commit sequence. A new focus boundary closes the previous
edit, so two genuine edits with the same final value remain distinct.

## Cross-renderer capture

Capture resolves targets through `Event.composedPath()` when available, allowing
open Shadow DOM controls to expose their actual interactive element. Standard
BC, React, Material UI, same-origin frames, nested frames, and control add-ins
share the same value and identity contracts. No React-specific semantic engine
exists.

Checkbox click/change mechanics with observed checked state become
`toggle-change`. Option and list/repeater selection become `selection-change`.
Dialog presence transitions are captured and normalized separately as
`dialog-open` and `dialog-close`. Navigation requires captured page/URL
transition evidence; MutationObserver activity alone is not a business action.

Unknown mechanics remain `unknown` with their raw source identity and evidence.
No wording, intent, step boundary, or business outcome is generated here.

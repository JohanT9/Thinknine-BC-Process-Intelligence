# Event Normalization

## Purpose and ownership

Event Normalization converts browser-shaped canonical evidence into stable,
business-neutral UI mechanics:

```text
Canonical Raw Event -> BC Identification -> Normalized Interaction Event
```

Normalization is a derived, immutable, in-memory projection. Canonical events,
`event.raw`, identification, assets, Review state, and exports are never mutated.
The original browser event type remains available as `rawEventType`.

## Schema and kinds

Schema v1 contains deterministic normalized and source IDs, recording ID, kind,
subtype, canonical timestamp and sequence, frame and identification metadata,
interaction mechanism, value, previous value, selection, state, coordinates,
screenshot reference, source provenance, evidence, and future fields.

The stable kinds are:

- `activation`
- `value-change`
- `selection-change`
- `toggle-change`
- `keyboard-action`
- `navigation`
- `focus-transition`
- `lookup-open`
- `dialog-action`
- `row-selection`
- `unknown`

These describe UI mechanics, never business intent.

## Mapping and values

Identified button pointer activation and Enter/Space activation both become
`activation`, while mechanism remains `pointer` or `keyboard`. Input/change and
verified changed-value focusout become `value-change`. Checked controls become
`toggle-change`; options become `selection-change`; identified lookup triggers
become `lookup-open`; list/repeater cells become `row-selection`. Navigation,
non-activation keys, dialog actions, and unknown future events retain distinct
safe fallbacks.

Values retain their original type and representation in `value.raw` and
`value.normalized`. Numeric-looking strings are never coerced. An ISO date from
an identified date control is marked `iso-date` without timezone conversion.
Localized dates are preserved without locale guessing. Verified boolean state is
stored as `state.checked`; no enable/disable wording is generated.

## React/MUI and focus policy

Capture stores the value present at focus and includes it as `previousValue` on
field events. If a React/MUI control changes DOM value without input/change, a
focusout whose value differs from the captured initial value becomes the same
`value-change` contract. There is no React-specific normalized model.

Focus-only and unchanged focusout evidence produces no normalized event. An old
focusout lacking verifiable previous value degrades to diagnostic
`focus-transition`. Raw focus evidence is always retained canonically and does
not become a visible documentation step.

## Mechanical coalescing, identity, and ordering

Consecutive input/change/focusout events for the same identified control and
exact same committed value coalesce into one normalized mechanic. This is not
semantic consolidation. Every contributing canonical ID is retained in
`sourceEventIds`; the final committed source event is the primary
`sourceEventId` and owns timestamp/sequence.

The deterministic ID uses a collision-safe, length-prefixed composition of
stable contributing canonical event IDs.
Language, Review edits, semantic rules, and export runs cannot change it.
Normalization never reorders evidence. A focus lifecycle boundary prevents two
separate interactions with the same value from coalescing.

## Frames, coordinates, diagnostics, and fallback

Top-frame and iframe mechanics normalize identically. Frame metadata retains
tab/frame/parent/document identifiers, origin, frame depth, source frame UUID,
and local sequence when available. Coordinates retain pointer position, local
and top-viewport bounds, device pixel ratio, and viewport scale without making
screenshot decisions.

Evidence stores a sanitized rule reason such as
`changed-value-on-focusout-fallback`, never the entered value. Unknown event
types produce `unknown` rather than failure or invented meaning. Legacy canonical
events normalize without migration and degrade when modern metadata is absent.

## Semantic integration, performance, and privacy

The session read contract exposes normalized events and attaches matching
mechanics to detached legacy projections. Semantic Interaction Rules prefer
`value-change` mechanics for typed-field detection while retaining legacy
`inputSource` fallback. Language, presentation, screenshot selection, Review,
Workspace, and Word remain unchanged.

Normalization performs no DOM access, external lookup, AI, OCR, or network
request. Results are cached by immutable canonical recording identity. A large
recording regression guards deterministic linear projection cost. Sensitive
values are not copied into diagnostics or evidence.

## Step grouping handoff

Ordered normalized output is consumed by Event â†’ Step Grouping. Normalization
owns browser-mechanic coalescing; grouping owns candidate documentation-step
boundaries. Semantic business meaning remains downstream of both layers.
Normalized event kind and primary-event alignment later provide metadata signals
to Screenshot Selection; normalization itself never chooses an image.

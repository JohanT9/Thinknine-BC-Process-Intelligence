# Business Central UI Identification

## Purpose and architecture

BC UI Identification describes observable interface structure without assigning
business meaning:

```text
Canonical Raw Event -> immutable BCUIIdentification -> semantic interpretation
```

Each schema-v1 result references its canonical `eventId` and contains page,
control, action, nearest container, ordered hierarchy, frame context,
qualitative confidence, and safe evidence. It is persisted beside `event.raw`.
Raw evidence is never changed.

Identification is the structural input to Event Normalization. The normalizer
references page, control, action, container, and frame metadata without changing
the identification result or duplicating its evidence into raw capture.
Stable control and page identities are also the preferred evidence for safe Step
Group continuity; captions are used only as an in-recording fallback.

## Pages

The layer retains page caption, route, explicitly captured page name, and the
Business Central `page` route parameter when present. A route parameter is an
exact observed page ID; captions are never mapped to IDs. Dialog hierarchy adds
modal status and observed dialog caption. Parent/subpage relationships are kept
only when present in captured bounded ancestry.

## Controls and actions

Control identity and caption are separate. Technical identity may come from
`data-automation-id`, `data-control-id`, `data-control-name`, `name`, or element
`id`, in that order. Explicit field/control IDs are retained when exposed. The
layer conservatively classifies fields, lookups, options, checkboxes, date
inputs, buttons, links, tabs, repeater cells, rows, and unknown controls using
element type, input type, ARIA role, and `aria-haspopup`.

Actions are separate metadata with observed caption, technical identity,
enabled state, invocation mechanism, and captured action-group hierarchy. An
action ID is never inferred from its caption.

## Hierarchy and complex surfaces

Capture inspects at most eight target ancestors. Explicit control/part type and
semantic ARIA roles are preferred. Compatibility class-name heuristics may mark
FastTabs, FactBoxes, subpages, action bars, and control add-ins; evidence and
qualitative confidence expose that limitation. Observable lookup dialogs,
repeaters, rows, subpages, FactBoxes, groups, and action groups retain their
ordered hierarchy. A visual row index may survive as evidence but is never a
record identity.

React and control-add-in content uses only browser-visible attributes, labels,
roles, input types, frame metadata, and bounded containers. React internals are
never inspected. A text input with a date-shaped placeholder can be classified
as `dateInput` with `partial` confidence; its placeholder is not a Business
Central field identity.

## Accessible names and localization

Capture precedence is:

1. `aria-labelledby`
2. `aria-label`
3. associated `label[for]`
4. interactive element text
5. `title`
6. `placeholder`
7. bounded surrounding-label fallback

Localized captions are preserved exactly as display metadata. Language-neutral
technical attributes remain identity when available. There are no caption-to-ID
tables or Swedish/English identification dictionaries.

## Evidence, confidence, and fallback

Evidence records structural sources such as route parameter, technical
attribute, accessible-name source, role, element type, and bounded ancestor. It
does not duplicate entered values. Confidence is deterministic: `exact`,
`strong`, `partial`, or `unknown`; it is not a probability.

Unknown is valid. If only a page caption is observed, only that caption is
stored. If a control has no technical identifier, its caption and conservative
classification remain without an invented ID. Unknown future raw metadata stays
in canonical `raw` and unknown future identification fields survive schema-v1
normalization.

## Integration, traceability, performance, and privacy

Detached legacy projections expose identification so existing caption selection
can prefer structured metadata. Semantic rules retain all prior fallbacks;
identification does not consolidate events, generate sentences, format text, or
select screenshots. Full Canonical Source Traceability remains a future task.

Identification is synchronous, target-local, dictionary-free, and immutable.
The capture path does not scan the complete DOM for ancestry. Associated-label
and `aria-labelledby` resolution use direct indexed lookups. No values are added
to evidence, no data is logged or sent externally, and no AI/OCR/network lookup
is used.

## Regeneration

The current identification owner may run again over stored observable evidence.
Its independent version is recorded in the Derived Revision; it may improve
derived identity but cannot add facts absent from capture. See
[REGENERATE_FROM_RECORDING.md](REGENERATE_FROM_RECORDING.md).

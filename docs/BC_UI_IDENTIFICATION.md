# Business Central UI Identification

## Boundary

BC UI Identification is the renderer-neutral layer between authoritative Raw
Event Persistence and future Event Normalization:

```text
Raw Event -> BC UI Identification -> Identified Event -> derived mechanics
```

It produces immutable Page, Control, Action, Entity/context, hierarchy, and
frame identity. It does not alter Canonical Recording, group events, generate
wording, or run in UI code. Dashboard consumes the module through compatibility
adapters; Knowledge Packs may consume its result but are not its identity owner.

## Evidence priority

Identity follows this order: stable BC/automation IDs, page IDs, control/data
attributes, accessibility and structural metadata, stable route metadata, then
localized caption fallback. A technical page or automation ID always wins over
a conflicting caption.

Known BC page IDs identify Sales Order, Purchase Order, Customer, Vendor, Item,
Warehouse Shipment, and Production Order independently of display language.
`pageIdentity` is `bc:page:<pageId>`. Page results also carry page type, observed
caption, entity, source, and evidence.

Control identity prefers `data-automation-id`, `data-control-id`,
`data-control-name`, name, then element ID. Control results keep ID fields,
automation ID, type, role, caption, conservative field hint, source, and
evidence. React/MUI and control-add-in elements use observable attributes, ARIA,
element/input type, bounded ancestry, and frame context—never framework internals.

Action identity prefers automation/control ID and derives a technical action
type only for recognizable stable identifiers. Caption fallback may identify
Open, Reopen, Release, Post, Search, and confirmation actions when no technical
identity provides the type. Unknown actions retain their caption and evidence
with `actionIdentity: null` and `actionType: null`.

## Localization and unknown UI

Captions are display evidence, not primary identity. Small fallback rule groups
are owned here by language (`sv`, `en`, and deliberately limited Danish-shaped
`da` forms), so another language can be added without changing semantic or UI
rules. The fallback never manufactures a BC page ID.

Unknown pages and controls are valid. They keep observable caption, conservative
control classification, hierarchy, frame data, and evidence while identity and
entity remain `null`. Missing captions are equally valid. Unknown future raw
metadata remains in raw evidence; unknown schema-v1 identification fields survive
normalization.

## Dashboard compatibility

Dashboard no longer owns primary Page, Control, Action, status/post/open-record,
or entity caption rules. Its compatibility adapters call
`T9BCUIIdentification.identifyPage`, `identifyControl`, and `identifyAction`.
Existing presentation-only generic document labels remain in dashboard so this
milestone does not change document wording. Review, Document Workspace, and Word
behavior remain unchanged.

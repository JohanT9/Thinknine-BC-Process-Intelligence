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
adapters. Page classification delegates exclusively to the Page Identification
Engine; Knowledge Packs own its modular definition data.

## Evidence priority

Identity follows this order: stable BC/automation IDs, verified page object IDs, control/data
attributes, accessibility and structural metadata, stable route metadata, then
localized caption fallback. A technical page or automation ID always wins over
a conflicting caption.

## Page identity contract

Page fields have deliberately separate meanings:

- `pageId` is the unchanged legacy compatibility value. Existing consumers may
  contain either a route value or a semantic key such as `SalesOrder`.
- `pageObjectId` is a normalized positive numeric string only when the captured
  `pageId` agrees with the `page` query parameter in captured frame/top URL
  evidence. It is absent otherwise.
- `pageCaption`/`caption` is the observed user-facing text and is never an object
  identifier.
- `entity` is a stable semantic string, never a numeric page object identifier.
- `pageType` is derived engine metadata such as `card`, `list`, or `document`.
- `tableId` is optional verified metadata and is never inferred from either
  `pageId` or `pageObjectId`.
- `recordType` is optional semantic metadata and is never assigned by the
  recorder.

Known BC page object IDs may identify Sales Order, Purchase Order, Customer,
Vendor, Item, Warehouse Shipment, and Production Order independently of display
language. For verified values, `pageIdentity` is
`bc:page:<pageObjectId>`. A numeric legacy `pageId` without matching route
evidence remains a legacy value and does not activate technical classification.
Malformed values and semantic legacy values never become `pageObjectId`.

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

Captions are display evidence, not primary identity. Localized page caption
rules live in optional Knowledge Pack `pageDefinitions` and are resolved only by
the Page Identification Engine. The fallback never manufactures a BC page
object ID, table ID, or record type. See
[Page Identification Engine](PAGE_IDENTIFICATION_ENGINE.md).

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

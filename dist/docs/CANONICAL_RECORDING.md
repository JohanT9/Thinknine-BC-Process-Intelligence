# Canonical Recording

## Hardened evidence contract

Canonical Recording is the canonical immutable evidence projection consumed by
derived layers. Raw Event Persistence is the authoritative intake for new
captures. Here, “canonical” refers to recording evidence. Semantic Document is
separately the canonical document representation for rendering; it is not
captured evidence.

Schema-v1 operations `create`, `normalize`, `addEvent`, `addScreenshot`, and
`finish` do not mutate their inputs and accept deeply frozen/serialized state.
Events are append-only, retain insertion sequence, and cannot be edited, removed,
reordered, or replaced by derived Steps. Completed evidence rejects further
events and screenshot associations.

Generated Event IDs remain deterministic for their source identity:
`recordingId:event:sourceEventId` for new multi-frame deliveries and the backward-
compatible `recordingId:event:eventNo` fallback for legacy input. No identity
format changed. The source delivery ID remains stable through serialized
service-worker persistence, and queue order owns canonical sequence.

Screenshot asset IDs remain `recordingId:screenshot:eventNo`; they do not depend
on filename or image bytes. Registration locates the source Event first, creates
the deterministic asset, and links by ID. A repeated association is idempotent;
it cannot replace accepted asset evidence. Unknown or broken Event/asset
references are explicit errors/diagnostics.

`integrityDiagnostics` reports unsupported schema, duplicate Event identity,
ordering errors, missing screenshot assets, and detectable legacy/canonical count
mismatch. Unsupported schemas fail with their actual version. Current-schema
unknown fields survive cloning/normalization, while legacy normalization remains
in-memory and non-destructive.

Standard `npm test` runs `test:canonical` through its `posttest` lifecycle, so
`npm run ci` cannot omit the evidence suite. Release-readiness and canonical
hardening regressions lock this configuration.

During capture, authoritative raw append precedes identification and canonical
projection; canonical Event/asset writes precede compatibility writes.
Finalization waits up to 60 seconds for accepted Event writes, screenshot
registrations, and the canonical persistence queue. Pending/failed writes or
integrity mismatches are recorded in technical debug diagnostics and prevent the
recording from being marked complete. Successful legacy projection, Review,
Document Workspace, and Word behavior is unchanged.

The source identity and accepted order live in durable raw storage rather than
only in the service-worker queue. After restart, redelivery is idempotent and can
repair a missing Canonical projection. Successful finalization requires raw and
Canonical counts to match and does not conceal known load/save failure.

Manual Information Steps never create canonical events. Their manual provenance
and empty event references explicitly separate documentation from evidence.

Hide, Merge, and Split are document-presentation intent. They never delete or
partition canonical evidence; their stored source IDs preserve the evidence chain.

Step Editor changes are sparse Review-layer overrides. They can alter or hide a
document projection but can never update or delete canonical events or assets.

The Canonical Recording is the permanent source of truth for captured activity.
Generated documentation, review edits, process models, and exports are derived
data; they must not replace or rewrite the original events.

```text
Capture -> Canonical Recording -> Future interpretation layer
        -> Process / Support / Training -> Exporters
```

## Schema version 1

`RecordingSession` contains `id`, `schemaVersion`, `metadata`, immutable source
`events`, referenced `assets`, `createdAt`, and `updatedAt`. Understood event
properties are normalized while the complete captured event, including unknown
fields, is retained in `raw`.

Screenshots remain physically stored by the existing browser-storage mechanism.
Each recording asset has a stable ID and storage-compatible path; an event uses
`screenshotAssetId`, so the filename is not its identity.

Schema handling is centralized in `engine/canonical-recording.js`. Future
non-destructive migrations belong in `normalize`. Legacy session, event, and
screenshot records are normalized in memory as schema v1 without modifying the
original stored values.

New captures are dual-written to the canonical key and established storage keys.
Dashboard processing and Word export receive a legacy-shaped projection from the
canonical recording, preserving current behavior. Review edits remain separate
and cannot remove canonical source events. Future process steps should reference
source event IDs instead of replacing events.

## Normalized interaction projection

Normalized Interaction Events are derived on read from immutable canonical
events and identification. They are not stored back into Canonical Recording.
Each normalized event references a primary canonical event and every contributing
source ID. Raw browser type and evidence remain reconstructable. See
[Event Normalization](EVENT_NORMALIZATION.md).

Step Groups are a second derived projection over normalized mechanics. They
preserve canonical source IDs but are never written into or used to modify the
Canonical Recording.

Screenshot Selection consumes only asset references already traceable to a Step
Group. Its result is derived and never changes canonical assets, bytes, events,
or screenshot associations.

## Identification metadata

New events may contain `identification`, an immutable schema-v1 derived object
referencing the canonical event ID. It is persisted beside `raw`; it never
changes raw capture fields, identity, ordering, values, frames, or screenshots.
Legacy events without identification remain valid. See
[BC UI Identification](BC_UI_IDENTIFICATION.md).

### Business Central page identity

Schema version 1 uses an additive page identity contract. The complete source
event remains unchanged under `raw`. Canonical `page.id` and
`businessCentral.pageId` retain the source `pageId` exactly for compatibility.
They must therefore be treated as opaque legacy values.

When a positive numeric source `pageId` is verified against the captured
Business Central `page` route parameter, its normalized string is also exposed
as `page.pageObjectId` and `businessCentral.pageObjectId`. The observed caption
is exposed consistently as `page.caption` and
`businessCentral.pageCaption`; established aliases `page.name` and
`businessCentral.pageName` remain available.

Derived `entity`, `pageType`, optional `tableId`, and optional `recordType` may
be carried in `page` when identification supplies them. `entity` is semantic,
not numeric. `tableId` is never inferred from a page object ID. Missing or
malformed page evidence remains valid and does not prevent capture.

The Page Identification Engine supplies classification provenance in the
separate event `identification.pageIdentity` object, including source, provider,
rule, confidence, and conflict diagnostics when known. Canonical Recording does
not resolve definitions and never writes the result into `raw`.

These optional fields do not change required schema-v1 invariants, so the
Canonical Recording schema version remains 1. `fromLegacy` derives only the
verified route fact while preserving the historical raw event. `legacyView`
continues to return the original legacy shape and does not inject derived
`pageObjectId` into raw source data.

## Raw persistence boundary

For new captures, the separate Raw Event Persistence append is authoritative
and occurs before identification or canonical projection. Events
carry a source delivery ID and monotonically increasing canonical `sequence`.
They may receive a delayed `screenshotAssetId` while recording is active, but
cannot be replaced or deleted. Finalization waits for accepted writes and then
prevents further event or asset changes. The serialized ownership and recovery
contract is documented in [Raw Event Persistence](RAW_EVENT_PERSISTENCE.md).

## Process Model traceability

Generated process activities store canonical Event IDs as references; the
Process Model never copies or rewrites Canonical Recording payloads. Manual
nodes remain explicitly manual and claim no canonical evidence. See
[PROCESS_MODEL.md](PROCESS_MODEL.md).

## Historical traceability

Process Versions preserve the canonical Event references present when their
Process Model snapshot is created. Version creation and comparison never mutate
or replay Canonical Recording. External evidence retention may limit future deep
navigation, but stored semantic history remains intact. See
[PROCESS_VERSIONING.md](PROCESS_VERSIONING.md).

## Regeneration source

Canonical Recording is the sole evidence source for regeneration and is checked
for structural equivalence before and after projection. Regeneration cannot add
missing evidence or rewrite historical events. See
[REGENERATE_FROM_RECORDING.md](REGENERATE_FROM_RECORDING.md).

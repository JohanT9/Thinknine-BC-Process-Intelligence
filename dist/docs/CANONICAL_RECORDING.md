# Canonical Recording

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

## Identification metadata

New events may contain `identification`, an immutable schema-v1 derived object
referencing the canonical event ID. It is persisted beside `raw`; it never
changes raw capture fields, identity, ordering, values, frames, or screenshots.
Legacy events without identification remain valid. See
[BC UI Identification](BC_UI_IDENTIFICATION.md).

## Raw persistence boundary

For new captures, canonical append is the first durable evidence write. Events
carry a source delivery ID and monotonically increasing canonical `sequence`.
They may receive a delayed `screenshotAssetId` while recording is active, but
cannot be replaced or deleted. Finalization waits for accepted writes and then
prevents further event or asset changes. The serialized ownership and recovery
contract is documented in [Raw Event Persistence](RAW_EVENT_PERSISTENCE.md).

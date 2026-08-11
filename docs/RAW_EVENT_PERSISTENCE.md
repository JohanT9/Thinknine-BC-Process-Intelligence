# Raw Event Persistence

## Purpose and boundary

Raw Event Persistence makes Canonical Recording schema v1 the durable source of
truth for what a new recording observed. Persistence performs structural
normalization only. Semantic Actions, language, presentation, screenshot
selection, document plans, Review state, and exports are derived interpretations
and cannot write back to raw evidence.

After privacy normalization, accepted raw evidence is structurally identified
by the deterministic BC UI Identification layer before the combined canonical
event is saved. Identification is derived metadata stored separately from
`event.raw`; persistence never rewrites raw evidence to match identification.
Event Normalization subsequently derives mechanics in memory and performs no
canonical or legacy storage writes.
Step Grouping is likewise derived and cannot suppress or delete persisted raw
evidence.

## Storage contract

- Canonical key: `t9_recording_<recordingId>`.
- Schema: `schemaVersion: 1` at recording and event level.
- Physical store: currently `chrome.storage.local`, behind a load/save adapter.
- Writer: one serialized `T9RawEventPersistence` queue owns canonical changes.
- Active operations: create, append event, associate screenshot, finalize.
- Legacy keys continue as compatibility projections and are not authoritative
  for new evidence.

An interrupted active recording remains stored with no `finishedAt`, retaining
all canonical writes completed before interruption. A restarted service worker
loads the latest recording for each new operation, so queue state is not needed
to recover durable evidence.

## Event identity and ordering

Each content-script frame has a runtime frame UUID and frame-local sequence.
Every interaction delivery receives a source UUID. Its canonical ID is:

```text
<recordingId>:event:<sourceEventId>
```

Canonical `sequence` is the one-based append order and is the authoritative
total ordering contract. Capture timestamp, source sequence, frame ID, frame
sequence, frame URL, top URL, and depth are retained independently. Events are
never reordered by timestamp or semantic meaning. Equal timestamps are valid.

Exact source UUID equality identifies a duplicate delivery. Similar type,
target, value, or timestamp does not. Legacy recordings use deterministic
`<recordingId>:event:<eventNo>` identities; recordings lacking a reliable event
number are limited to deterministic input-array position.

## Raw and normalized data

Normalized fields expose recording ID, event ID, type, capture time, sequence,
source/frame provenance, page and Business Central context, control and
accessible target information, value, previous value, coordinates, selector,
and screenshot reference when captured. The accepted, privacy-normalized capture
payload is preserved independently in `event.raw`, including unknown fields.
Persistence does not infer intent or fabricate absent metadata.

## Append-only behavior and immutability

During capture, events can only be appended. A delayed screenshot association
adds an asset reference to the matching stable event; it is not event
replacement. Missing or failed screenshots do not invalidate events.

Stop rejects new acceptance, drains already accepted event writes and the active
screenshot worker, and only then writes `finishedAt`. Canonical model operations
reject event append and screenshot association after this boundary. Review and
document layers receive detached legacy-shaped projections, which provides the
structural ownership boundary without deep-freezing the hot path.

## Screenshot association

Screenshot bytes stay in the existing screenshot store and are never duplicated
inside events. The capture queue carries the canonical event ID. Registration is
serialized with event writes and creates a stable recording asset; only the
matching event receives `screenshotAssetId`. Queue reuse remains governed by the
existing category/capture-key policy. Capture failure leaves raw evidence intact.

## Failure recovery

Canonical save happens before legacy event projection. A canonical storage
failure rejects the accepted operation, records only a sanitized error string,
and leaves the previously durable recording unchanged. The write queue recovers
for later operations. Malformed events are rejected before save, duplicate
deliveries are no-ops, and finalization is ordered behind pending writes.
No missing evidence is fabricated.

## Legacy and derived compatibility

Opening legacy keys produces the same schema-v1 read contract in memory without
persisting a migration. Dashboard and Word continue to consume a detached
legacy-shaped projection from canonical evidence. Review merge, split, move,
suppress, screenshot, annotation, undo, and redo operations remain in Review
storage. Traceability flows in one direction: future Semantic Actions and
document objects may reference `sourceEventIds`; raw events will not reference
derived objects. Canonical Source Traceability is intentionally not implemented
in this milestone.

## Performance, security, and privacy

Persistence performs no semantic processing, network calls, image duplication,
or UI work. `chrome.storage.local` requires whole-record writes today; the
adapter boundary permits a future append-oriented physical store without
changing identity or ordering. A 1,000-event regression guards obvious hot-path
performance deterioration.

Capture values continue through existing privacy masking before canonical
persistence. Production diagnostics contain counts and a short label but never
dump complete raw payloads or recording data. No canonical data leaves the
extension or is sent to AI services.

## Regeneration

Persisted raw events are read through the Canonical Recording boundary for local
reinterpretation. No raw persistence write, migration, upload, or reconstruction
is part of regeneration. See
[REGENERATE_FROM_RECORDING.md](REGENERATE_FROM_RECORDING.md).

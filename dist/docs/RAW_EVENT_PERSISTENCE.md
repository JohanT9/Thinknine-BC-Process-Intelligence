# Raw Event Persistence

## Authority and boundary

Raw Event Persistence is the authoritative intake log for new captures.
Persistence preserves evidence; interpretation removes noise later. After the
explicit privacy capture policy, every accepted source delivery is durably
appended before BC UI Identification, Canonical Recording projection, Event
Normalization, grouping, Review, document generation, or export.

The authoritative key is `t9_raw_recording_<recordingId>`. Canonical Recording
at `t9_recording_<recordingId>` consumes successfully persisted raw entries.
Legacy session, event, and screenshot keys remain compatibility projections.
Existing recordings are read without bulk migration.

## Identity and duplicate contract

At the capture source, `sourceEventId` has this structure:

```text
<recordingId>:<frameInstanceId>:<localSequence>
```

The recording ID, runtime frame UUID, and frame-local monotonic sequence make
identity independent of display content. Browser `tabId`, `frameId`,
`documentId`, parent frame, URLs, and capture producer are retained as capture
context when available. Canonical identity remains
`<recordingId>:event:<sourceEventId>`.

Only equal `sourceEventId` values prove redelivery. Equal fields, values, types,
labels, timestamps, or timing proximity never prove duplication. Rapid repeated
clicks and repeated entry of the same field value remain separate evidence.

## Ordering and payload

Each raw entry receives `acceptedSequence`, a one-based recording-level order
assigned by the serialized intake queue. Source-local ordering remains in
`sourceSequence`; frame and document context preserve capture provenance without
pretending truly concurrent browser interactions have a causal order. Canonical
`sequence` projects accepted order and timestamps never reorder evidence.

The complete privacy-processed source payload is retained, including event type,
target/control descriptors, values/state, page context, coordinates, frame
context, provenance, and unknown future fields. Persistence does not normalize
values, infer intent, or manufacture semantic actions.

## Persistence and restart contract

Higher layers use `appendRawEvent(recordingId, event)` and never load/mutate a
raw array themselves. The adapter currently stores one whole value because
`chrome.storage.local` has no native append primitive; its boundary permits a
future chunked store without changing callers, identity, or ordering.

Correctness does not depend on queue memory surviving. After service-worker
restart, the next store instance reloads durable identities and accepted count.
A repeated source ID is suppressed safely. If raw append succeeded but Canonical
projection failed, redelivery can repair Canonical without duplicating raw data.

Raw save failure rejects capture and records `raw-event-write-failure` in
technical diagnostics. Stop drains raw and canonical queues with bounded
waiting and compares raw and canonical counts, so completion cannot conceal
unprojected accepted evidence.

## Maximum size and performance

At `maxEvents`, every previously accepted event remains intact. The raw record is
marked `truncated` and durably receives `raw-event-limit-reached` with the limit
and rejected source identity. Recorder health makes incomplete capture explicit.

Regression coverage measures 1,000, 10,000, and 20,000 entries. The performance
guards reject obvious quadratic
deterioration. Screenshot bytes remain in existing screenshot storage.

## Compatibility

Canonical Recording, Review, Document Workspace, and Word retain their existing
shapes and behavior. Legacy recordings require no migration. Raw evidence never
references derived normalized events, steps, documents, or Review edits.

# Canonical Process adapter — phase 1B

`src/engine/canonical-process-adapter.js` exports `normalizeProcess` in Node and as
`BCProcessAdapter` in a browser. It accepts `{ recording, interpretation,
normalizedEvents, stepGroups, normalizerVersion, recordingRevisionId,
knowledgeReleaseId }` and returns `{ ok, process, diagnostics }`.

The adapter projects the existing interpretation business tasks. It references
Canonical Recording event IDs, event-normalization IDs, step-group IDs and semantic
action IDs. Captured values are JSON Pointers into the original event's `raw` field.
It carries confirmed result-event references from result verification and preserves
recorded captions verbatim. A legacy recording without a persisted revision gets a
repeatable content revision ID.

Process and step IDs do not use localized captions, confidence scores or knowledge
classification. A step uses its preferred source event as its identity anchor, with
the first source event as fallback. The overall process revision includes recording,
interpretation, normalized/grouped inputs and selected release. Reclassification may
therefore create a new process revision while retaining evidence anchored step IDs.

The content fingerprint is two seeded 64-bit FNV-1a values. It is a compact stable
local fingerprint, not a cryptographic signature and must not be used to prove data
authenticity or authorization.

A matched knowledge rule requires an explicit `knowledgeReleaseId`; a rule name and
pack version alone cannot identify the complete release. Manual classifications need
an actual `classificationMetadata.changeId`; the adapter does not invent review
history. Broken canonical lineage produces errors and no process. Missing optional
normalization details produce warnings. It never writes to the recording, review
state, store or external service.

`validateProcess` accepts normalized events, step groups and semantic actions to check
those IDs. Release entry existence and external change history remain outside the
locally available validation context. The dashboard's `prepareSessionModel` creates
the process projection alongside its existing review model. The projection is not
persisted and existing review, document and export consumers still use their current
inputs; promotion to those contracts follows after the projection has been evaluated
against real recordings.

# Canonical Process Schema — phase 1A

The schema and reference validator define a derived process contract. They do not
replace Canonical Recording, review state, Semantic Document or process-map models.
No capture, storage, interpretation or export consumer is switched in phase 1A.

## API

`src/engine/canonical-process-schema.js` exposes `BCProcessSchema` in browsers and
CommonJS exports in Node: `SCHEMA_VERSION`, immutable `schema`, and
`validateProcess(process, { recording, recordingRevisionId })`.

The validator returns `{code, severity, subjectRef, details}[]`. `subjectRef` is a
JSON Pointer; codes are technical identifiers, not user-facing messages. It never
modifies input, coerces values, clamps confidence, fills defaults or migrates data.
Unknown properties and extension fields are allowed and left intact. The input
must be JSON data; cycles, undefined and non-finite numbers are rejected.

The exported `canonical-process.schema.json` is a JSON Schema 2020-12 structural
contract. Regenerate it using `node scripts/export-canonical-process-schema.js
--write`. Without the flag the script checks for drift. The runtime evaluator is
limited to the keywords used in this schema, not a general-purpose schema library.
Cross-reference and semantic invariants are enforced by `validateProcess`, so JSON
Schema validation alone is insufficient.

## Concrete v1 decisions

- Context has required nullable `sourceLanguage`, `bcVersion`, `installedApps`.
- Object references have nullable appId, publisher, objectType, objectId,
  appVersion; numeric object IDs are strings. Captions never establish identity.
- Control references have nullable controlId, automationId and fieldId.
- Value/message references are `{eventId, pointer}` within canonical events.
  Missing, null, false, zero and empty string remain distinct.
- Manual steps use `extensions["bc-process-studio"].manualChangeRef` with changeId
  and revisionId. Manual interpretations require this same explicit reference.
- A conditionRef is null, an event/pointer reference, or a manual change/revision
  reference; manual conditions require manual relation basis.
- Sequence is contiguous, starting at one. Stable step IDs do not depend on it.
- Unsupported schema versions fail before traversing or rewriting the process.

## Validation boundaries

With recording context, the validator checks recording identity, supplied revision,
event and asset uniqueness, event/asset existence and value pointers. For legacy
recordings, callers may pass a trusted `recordingRevisionId`; digest calculation
belongs to the phase-1B adapter. Missing recording/revision context yields warnings,
not a claim that referential integrity was verified.

Result evidence must belong to the step and exist. A referenced event alone cannot
establish that an operation succeeded. Non-unknown outcomes explicitly produce
`process-result-semantics-not-checked` until the adapter verifies domain semantics.
Derived event/group/action references similarly warn when populated: their owning
models are not part of this phase's validation context. Knowledge entry and concept
existence checks await the phase-2 repository and are explicitly marked unchecked.
Rule provenance and consistency with the selected release are checked now.

The validator cannot verify external manual change history in phase 1A; it checks
the reference shape and requirement only. Do not present zero errors as a verified
business process, or persist over the recording based on this validator.

## Verification and next increment

`npm run test:canonical-process` checks behavior and snapshot parity. It is included
in `test:canonical`, which is already part of CI. Tests cover browser/Node parity,
immutable input, unsupported versions, ambiguous interpretations, broken references,
manual steps, result evidence, unknown fields and JSON Pointer edge cases.

No user-facing strings or language settings change. The model preserves captured
labels without translating them. Phase 1B will project the existing normalization
and interpretation models into this contract and verify deterministic identities.

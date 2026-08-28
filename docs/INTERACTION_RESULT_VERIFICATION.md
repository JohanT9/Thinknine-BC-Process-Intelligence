# Interaction Result Verification

## Purpose

Result Verification records what Business Central observably did after an
interaction. It improves review confidence without guessing business intent or
changing the consultant's editable expected result.

```text
Raw Event -> Normalized Event -> Step Group capture packet
          -> Semantic Action -> Review Step
```

Step Grouping owns the mechanical relationship between an activation and its
immediate outcomes. Semantic rules receive that resolved relationship and do
not rediscover adjacent events.

## Contract

Each capture packet contains an additive immutable `resultVerification` object:

- `status`: `verified`, `error`, or `unverified`
- `primaryOutcome`: the deterministic outcome kind
- `outcomes`: ordered normalized and canonical source references
- `summary`: concise observed result for Review Studio
- `expectedResultSuggestion`: a non-destructive suggestion
- `sourceEventIds`: canonical traceability

Supported outcomes are navigation, dialog open/close, value change, selection,
toggle change, and Business Central error. An action may collect more than one
immediate outcome, for example a dialog opening followed by an error.

The model stores only bounded outcome facts and captions already present in
normalized context. It does not copy error details, call stacks, entered
business values, URLs, or raw payloads. Full evidence remains in Canonical
Recording.

## User experience and compatibility

Verified steps show a compact **Observerat resultat** line in Review Studio.
The document-level expected-result field remains fully manual and is never
overwritten. Historical recordings and Reviews without verification metadata
continue unchanged.

This is an additive schema-v1 projection. Canonical Recording schema version is
unchanged, and raw events are neither modified nor rewritten.

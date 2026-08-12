# Canonical traceability

Canonical event identity is authoritative for recordings created by the current
pipeline. The supported chain is:

`Canonical Event → Normalized Event → Step Group → Semantic Action → Resolved Step → Semantic Document sourceRef → Document Plan → Workspace / Word`

## Shared source reference contract

`src/engine/source-reference.js` normalizes and merges the identifiers that are
appropriate at each layer:

- `recordingId`
- `sourceEventIds`
- `normalizedEventIds`
- `stepGroupIds`
- `semanticActionIds`

Values are strings, de-duplicated, and remain in source order. Payloads are not
copied as provenance. A generated Review step derives its stable identity from
the most specific available interpretation identity (semantic action, step
group, normalized event, then canonical event), instead of its array position.

## True canonical uses

- Event Normalization copies Canonical Event `id` into `sourceEventIds`.
- Event → Step Grouping combines those IDs without inventing new event identity.
- Semantic Interaction preserves IDs supplied by groups and adds the semantic
  action ID.
- New Review tasks carry all available canonical reference levels.
- Merge unions references; split retains references on every derived step.
- Review projection places the references on the step, text, screenshot, note,
  and annotation-related document blocks.
- Document Planner copies block references to plan components.
- Workspace items retain the plan component reference. Word consumes the same
  immutable plan, so the export path retains the reference-bearing plan even
  though provenance is not printed in the document.

## Compatibility boundaries and remaining `sourceEventNos`

`sourceEventNos` is legacy compatibility metadata only. The shared normalizer
renames it to `legacyEventNos`; it never promotes it to `sourceEventIds`.

Remaining production uses are intentional:

- `dashboard.js`: old event interpreters, grouping adapters, context lookup, and
  persisted Review compatibility. New task construction also carries canonical
  references and stable IDs.
- `semantic-interaction-engine.js`: accepts and returns legacy event numbers for
  old Reviews while keeping them separate from canonical references.
- `review-merge.js`, `review-split.js`, and `manual-information-steps.js`:
  preserve old Review metadata during editing; canonical arrays are
  independently merged/preserved, and manual steps deliberately have no event
  evidence.
- `step-editor.js`, `documentation-hierarchy.js`,
  `step-structure-overrides.js`, `process-model.js`, and
  `regenerate-from-recording.js`: fallback readers for pre-milestone Reviews.
  Their `sourceEventIds` output in that fallback path is compatibility
  correlation data, not asserted as Canonical Event identity.
- `session-graph.js` and `screenshot-intelligence.js`: legacy graph and numeric
  screenshot lookup adapters.

Tests containing `sourceEventNos` exercise these boundaries and old Review
fixtures. No stored Review migration is required.

## Regeneration and visible output

Canonical IDs survive regeneration when regenerated steps originate from the
same canonical recording evidence. Stable task identity is derived from that
interpretation evidence, enabling sparse overrides to reconnect. Legacy Reviews
continue through compatibility matching and cannot gain true canonical identity
without being regenerated from canonical evidence.

The migration changes metadata and generated IDs only. Instructions,
screenshots, annotations, Workspace presentation, and Word-visible output do not
change.

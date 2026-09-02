# Business Central Process Taxonomy

## Purpose

The Business Central Process Taxonomy is the canonical semantic catalog for
classifying recordings, documentation, and process diagrams at several levels
of abstraction. It is separate from both Canonical Recording evidence and the
recording-specific Process Model.

```text
Process Domain
  → Business Process
    → Business Central Process
      → Process Step
        → Recorded User Action
```

Definitions live once in the taxonomy. A recording stores only stable taxonomy
references and mappings from its canonical Event IDs to `ProcessAction` and
`ProcessStep` IDs. This keeps recordings small and allows taxonomy definitions
to evolve independently.

## Domain model

The schema defines `ProcessDomain`, `BusinessProcess`, `BCProcess`,
`ProcessStep`, `ProcessDocument`, `ProcessAction`, `ProcessRelationship`, and
`ProcessVariant`. Every entity has a globally stable string ID and a readable
name. Unknown extension data belongs in `metadata` or `futureFields`; no entity
contains diagram geometry, DOM, CSS, Word, SVG, or other presentation fields.

Canonical relationship types are `precedes`, `follows`, `creates`, `posts`,
`releases`, `consumes`, `produces`, `references`, `branches_to`, and
`returns_to`. Relationships can connect any registered taxonomy entities and
are validated without imposing a renderer.

## Services

`process-taxonomy-schema.js` normalizes, freezes, and validates taxonomy data
and recording references. `process-taxonomy.js` creates an immutable registry
with:

- ID, name, and partial-name lookup;
- parent/child and complete hierarchy traversal;
- action-to-Step/BC Process/Business Process/Domain mapping;
- incoming and outgoing relationship queries;
- variant lookup;
- non-mutating extension registration;
- validation of recording classification references.

The services are deterministic and have no storage, UI, AI, or renderer
dependency. Recording analysis, AI classification, screenshot selection,
documentation projection, diagram generation, comparisons, and recommendations
can therefore consume the same semantic catalog.

Document-to-document and document-state knowledge is maintained in the separate
[Business Central Document Lifecycles](BUSINESS_CENTRAL_DOCUMENT_LIFECYCLES.md)
catalog. Taxonomy owns reusable document identity; Lifecycle owns configurable,
optional paths between those documents.

## Business Central seed

The initial seed contains Order to Cash, Source to Pay, Forecast to Plan,
Plan to Produce, Inventory to Deliver, Record to Report, Returns, Transfers,
Assembly, Item Tracking, Quality Management, and Warehouse Management.

Representative definitions cover standard Sales Order processing, Purchase to
Pay, Warehouse Inbound, Warehouse Outbound, Transfer Orders, Production,
Assembly, and Planning. They reference Business Central documents, page object
IDs, table IDs, action names, controls, steps, and variants. The seed is
deliberately representative rather than exhaustive.

## Extension contract

Extensions add complete entities with their own stable namespace and references
through `registry.extend()`. For example, an Aptean Food & Beverage package can
add a domain, business processes, BC processes, steps, actions, documents,
relationships, and variants without changing the BC seed or existing recording
references. Duplicate IDs and broken cross-references are rejected.

## Recording references

Canonical Recording metadata contains a normalized `taxonomyReferences` value:

```json
{
  "taxonomyId": "bc-process-taxonomy",
  "domainId": "domain:order-to-cash",
  "businessProcessId": "business-process:sales-order-processing",
  "bcProcessId": "bc-process:order-to-cash:standard-sales-order",
  "variantId": "variant:otc:ship-and-invoice",
  "processStepIds": [
    "step:order-to-cash:standard-sales-order:create-sales-order"
  ],
  "actionMappings": [{
    "recordedActionId": "recording:event:17",
    "processActionId": "action:order-to-cash:standard-sales-order:select-customer",
    "processStepId": "step:order-to-cash:standard-sales-order:create-sales-order"
  }],
  "classifiedBy": "analysis-engine",
  "confidence": 0.96
}
```

Classification is additive to Canonical Recording schema v1. Older recordings
normalize to an empty reference set and remain valid. Completed canonical
evidence remains immutable.

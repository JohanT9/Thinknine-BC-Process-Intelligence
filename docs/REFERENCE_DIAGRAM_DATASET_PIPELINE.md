# Reference Diagram Dataset Pipeline

## Purpose

The pipeline turns process sources into traceable, renderer-neutral Business
Central process knowledge. Images can be retained as licensed source assets,
but pixels are never canonical and are not assumed to be redistributable.
Deterministic metadata and manual verification take precedence over AI.

## Architecture

```text
ReferenceSource + optional SourceAsset
  -> Extract -> Normalize -> Classify -> Map BC entities
  -> Build ProcessGraph -> Validate -> Human review
  -> Publish -> Query, compare, recognize and export
```

`src/engine/reference-diagram-dataset.js` owns normalization, validation,
pipeline orchestration, verification, querying, comparison, duplicate analysis
and export. `src/document/process-graph.js` remains the one renderer-neutral
graph contract. Customer recordings remain separate from reference data.

## Data model

- `ReferenceSource` records publisher, origin, version, retrieval,
  verification and licence notes.
- `SourceAsset` is separate and records whether redistribution is permitted.
- `CanonicalProcessConcept` preserves a language-independent ID, aliases,
  localized captions and product namespace.
- `CanonicalDocument` adds optional BC object, table and page metadata. Unknown
  IDs remain `null`; IDs are never inferred merely from captions.
- `ReferenceDiagram` identifies process, variant, abstraction level, dataset
  partition and semantic ProcessGraph.
- `ReferenceFact` links every assertion to source, extraction, confidence and
  verification.
- Proposals, manual decisions and verification history are append-only audit
  records. Reviewer corrections do not erase machine proposals.

Confidence is retained independently for classification, nodes, entity mapping,
relationships and variants. Verification supports `Imported`, `Unreviewed`,
`AIClassified`, `PartiallyVerified`, `Verified`, `Rejected` and `Deprecated`.

## Ingestion and precedence

Built-in extractors accept JSON, structured diagrams, manually entered
processes, Canonical Recordings and image references. Image ingestion safely
returns `extractionRequired` until a provider is configured; no fragile OCR is
built in. Additional extractors and classifiers are injected through
`pipeline(options)`.

Proposal precedence is manual, known metadata, deterministic mapping, then AI.
AI confidence cannot silently override reliable metadata or a verified manual
decision. Original source labels are always retained beside canonical mappings.

## Validation and verification

Validation returns immutable `INFO`, `WARNING` and `ERROR` diagnostics for
missing sources and abstraction levels, duplicate identities, invalid graphs,
orphan group nodes, unknown concepts/assets, invalid BC object references,
circular sequences and missing boundaries. Warnings can be published; errors
cannot.

`decide(dataset, diagramId, decision)` appends a manual decision and verification
event while retaining the original proposal for audit.

## Search, matching and comparison

The registry exposes `findProcessByDocuments`, `findProcessByActions`,
`findProcessBySequence`, `findSimilarProcessGraphs`, `findReferenceDiagrams`,
`findCanonicalConcept` and `findCanonicalDocument`.
`matchRecordingToReferences` compares a projected Canonical Recording graph.

Comparison reports matched, missing, additional, reordered and unknown actions.
Extra customer steps are advisory and never automatically errors.

Duplicate analysis compares semantic graphs, not pixels, and returns
`ExactDuplicate`, `SemanticDuplicate`, `ProcessVariant`, `RelatedProcess` or
`DifferentProcess`. It never deletes references.

## Export, training isolation and namespaces

`exportDataset()` produces deterministic JSON with `schemaVersion: 1`, taxonomy,
sources, concepts, documents, graphs, confidence, verification and provenance.
Source asset binaries are excluded. Every diagram declares `Training`,
`Validation`, `Evaluation` or `GeneralReference`, so evaluation examples can be
excluded from future training by construction. No model training is included.

Nodes support `Microsoft.BusinessCentral`, `Aptean.FoodAndBeverage`,
`Thinknine.Custom` and `Customer.Custom`; one graph may combine namespaces.

## Complete warehouse example

### Source diagram

An internally verified warehouse-outbound definition is registered as a source.
No external image is embedded.

### Extracted representation

```text
Sales Order -> Release -> Warehouse Shipment -> Generate Pick
-> Warehouse Pick -> Register Pick -> Post Shipment
```

`Generate Pick` remains preserved as the source label.

### Normalized BC concepts

```text
Generate Pick    -> concept:create-warehouse-pick
Sales Order      -> document:sales-order
Warehouse Pick   -> document:warehouse-pick
```

### Semantic ProcessGraph

The graph uses document, process-step, posting and posted-document nodes with
`sequence`, `releases`, `creates` and `posts` relationships. Relationships have
source-backed facts.

### Verified reference and recording match

`Advanced Warehouse Outbound` is stored as an `Evaluation` reference with the
`Advanced Warehouse` variant. A Canonical Recording is projected to the same
graph contract. Matching returns alternatives and matched/missing steps. A
recorded `Customer Approval` is reported as customized additional behavior,
not an error.

## Initial seed

Ten curated references cover Simple Sales Order, Sales Order with Warehouse
Shipment, Advanced Warehouse Outbound, Simple Purchase Order, Warehouse
Inbound, Transfer Order, Production Order, Production Consumption and Output,
Assembly Order and Planning Worksheet.

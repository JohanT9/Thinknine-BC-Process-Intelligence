# Semantic Document Model 4.4

## Purpose

The semantic document model is the renderer-independent contract for future
Documentation Excellence work. It describes what a document contains, not how
Word, PDF or a browser should lay it out.

RC1 does not project Review data, plan pages, apply themes or alter export. The
existing Word exporter remains the production path.

## Data flow and boundaries

```text
Review data (existing, unchanged)
  ↓ future Review-to-document projector
Semantic document model (RC1)
  ↓ future layout planner
Renderer input
  ├─ Word renderer
  └─ future PDF renderer
```

The model must not contain renderer instructions such as fonts, margins, page
sizes, pagination, spacing or DOCX units. Source references point back to
Review entities but are descriptive and never mutate Review data.

## Schema

The public module is `src/document/semantic-document.js`. `SCHEMA_VERSION` is
the single schema-version definition. A document contains:

- `documentId`, `metadata`, `sections` and `assets`;
- sections with stable `sectionId`, semantic `kind` and ordered `blocks`;
- blocks with stable `blockId` and one of the supported semantic kinds;
- generic assets with stable `assetId`, `kind` and optional `sourceRef`;
- optional source references: `taskId`, `annotationId` and `screenshotRef`.

Supported RC1 block kinds are heading, paragraph, step, image, table, callout,
list, revision history, page break and TOC. Nested list items, table structures
and revision entries also use stable IDs.

## Normalization and immutability

`normalize` clones input, supplies structural defaults and recursively freezes
the result. It never mutates caller-owned objects. Immutable helpers add a
section, block or asset by producing a new normalized model.

`serialize` and `deserialize` provide deterministic JSON persistence. Object
property order follows the normalized input contract and array order remains
semantic.

## Validation

`validate` reports structured errors and warnings without throwing for
malformed data. It checks required and duplicate IDs, collection shapes, block
kinds, headings, asset and table references, source references, and accidental
renderer-specific fields.

Warnings do not invalidate a document. A future schema version or an unknown,
well-formed block kind is therefore preserved and reported without data loss.

## Compatibility and extension

Missing RC1 collections receive safe defaults, allowing older inputs to load
without manual migration. Unknown root, metadata, section, asset and supported
block properties survive normalize-save-load unchanged. Unknown well-formed
future blocks are retained verbatim.

Future work should extend the block registry and normalization/validation in
this module, then add a separate Review projector and layout planner. Renderers
must consume planned output rather than introduce format-specific properties
into this semantic model.

## RC1 exclusions

- no Review-to-document projection;
- no theme or layout engine;
- no Word or PDF integration;
- no automated document-improvement processors;
- no branding, templates or export behaviour changes.

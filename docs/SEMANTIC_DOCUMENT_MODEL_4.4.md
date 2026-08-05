# Semantic Document Model 4.4

## Purpose

The semantic document model is the renderer-independent contract for future
Documentation Excellence work. It describes what a document contains, not how
Word, PDF or a browser should lay it out.

RC2 adds the Review projector and RC3 adds an independent theme system. Neither
plans pages nor alters export. The existing Word exporter remains the production
path.

## Data flow and boundaries

```text
Review data (existing, unchanged)
  ↓ Review Document Projector (RC2)
Semantic document model
  ↓ future layout planner
Renderer input
  ├─ Word renderer
  └─ future PDF renderer
```

The future planner will consume the semantic document together with one
resolved theme. Theme data is never stored in or inferred from semantic blocks.

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

Image blocks may carry ordered `annotationRefs`. Each entry identifies an
annotation and its screenshot without copying or owning annotation data.

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

## Review projection

`src/document/review-document-projector.js` is the single producer that maps a
Review to this model. It projects document metadata, active tasks, comments,
screenshot references, annotation references and Review history. Screenshots
become generic image assets that contain references only; image bytes are never
loaded or copied.

Task and screenshot identity produces stable document IDs without randomness or
array-position identity. Reordering valid tasks therefore changes semantic
order without changing their step IDs. Legacy tasks without IDs receive the
same deterministic compatibility IDs used by Review normalization and produce
a diagnostic.

The projector returns `{ document, diagnostics }`. Both values are recursively
immutable. Diagnostics remain outside the document and report missing titles,
metadata, screenshots, empty steps and invalid references without affecting
rendering or persistence.

## Provenance

Projection adds serialization-safe document provenance with the fixed origin
`review-document-projector`, projector version, Review-derived generation time
and an explicit transformation list. It is metadata only: it does not affect
layout, rendering, Review persistence or Undo/Redo. Unknown provenance fields
provided through the projection boundary survive normalization and
serialization.

## Document Theme System

The theme system is split by responsibility:

- `document-theme.js` owns schema versioning, normalization, immutable data,
  deep merge, serialization and token resolution;
- `document-theme-validation.js` reports malformed or incomplete themes without
  mutation;
- `document-theme-registry.js` owns immutable registration, inheritance,
  explicit overrides and built-in themes.

Themes define appearance values for colors, typography, spacing, pages,
branding and semantic components. Page and spacing tokens are values only; no
module places content, calculates pages or interprets renderer units.

Inheritance is resolved from the oldest parent to the selected child and then
explicit overrides. Objects merge recursively, arrays and scalar values replace
their inherited value, and token references such as `{colors.primary}` resolve
against the fully inherited theme. Missing parents, duplicate IDs, inheritance
cycles and token-reference cycles fail predictably.

Capabilities such as `supportsCover`, `supportsFooter` and `supportsCallouts`
are descriptive metadata. They never gate document features. Unknown fields,
future versions and future capabilities remain serializable and immutable.

The built-in registry contains Base, Thinknine, Minimal and Corporate themes.
There is no UI selection and no renderer consumes them in RC3.

Future work should extend the block registry and normalization/validation in
this module, then add a separate layout planner. Renderers
must consume planned output rather than introduce format-specific properties
into this semantic model.

## RC3 exclusions

- no layout engine or theme selection UI;
- no Word or PDF integration;
- no automated document-improvement processors;
- no branding UI, branding asset loading, templates or export behaviour changes.

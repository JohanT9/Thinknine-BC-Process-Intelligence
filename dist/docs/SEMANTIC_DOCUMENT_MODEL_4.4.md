# Semantic Document Model 4.4

## Purpose

The semantic document model is the renderer-independent contract for future
Documentation Excellence work. It describes what a document contains, not how
Word, PDF or a browser should lay it out.

RC2 adds the Review projector, RC3 adds the independent theme system and RC4
adds the Document Planner. RC5 makes the validated plan the production Word
export contract.

## Data flow and boundaries

```text
Review data (existing, unchanged)
  ↓ Review Document Projector (RC2)
Semantic document model
  + resolved Document Theme
  ↓ Document Planner
Document Plan
  ↓ future renderer adapters
  ├─ Word renderer
  └─ future PDF renderer
```

The planner consumes the semantic document together with one resolved theme.
Theme data is never stored in or inferred from semantic blocks.

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
There is no UI selection and no renderer consumes them in RC4.

Theme schema format is identified by `themeSchemaVersion`, independently of a
theme package's own `version`. `origin` records provider/package identity as
metadata. `compatibility.semanticDocument` and `compatibility.planner` declare
supported producer contracts. Legacy themes normalize to the current schema and
wildcard compatibility, while future schema versions remain preserved and are
rejected by the current Planner until supported.

## Document Planner and Document Plan

The planning layer is split by responsibility:

- `document-plan.js` owns plan schema, normalization, immutability and JSON
  serialization;
- `document-planner.js` is the single producer and owns planning decisions;
- `document-plan-validation.js` validates plan consistency and references
  without mutation.

A Document Plan contains stable plan identity, Semantic Document and Theme
references, global components, ordered plan sections, nested components, page
and spacing values, and planner metadata. Components describe placement,
grouping, priority, visibility, page intent, `keepTogether` and `keepWithNext`.
They reference semantic content instead of copying or owning it.

Cover, metadata, workflow, steps, screenshots, callouts, tables, lists,
revision history, TOC, header and footer use reusable component structures.
List items, table rows and table cells retain explicit grouping. Capabilities
influence component presence or visibility; they never render anything.

The Planner accepts only a valid Semantic Document and a resolved, compatible
theme. Its output depends exclusively on those two immutable inputs. Plan
validation detects missing components, duplicate planning IDs, conflicting
capabilities, unsupported compatibility and invalid semantic references.

Plans intentionally contain no Word paragraphs, DOCX/PDF objects, twips, page
numbers or calculated pagination. Renderer adapters will consume plans but must
never create them.

The RC5 Word adapter consumes planned output plus prepared media without
introducing format-specific properties into the semantic model or duplicating
planning. It has no access to Review tasks, history, raw annotations, unresolved
themes or the theme registry.

RC6 adds a reusable component contract inside the Document Plan boundary.
Definitions describe semantic roles, required content and source references,
accessibility metadata, renderer-neutral presentation intent, optional theme
token references and capability requirements. Unknown future component kinds
and fields remain normalized and serialization-safe.

The built-in registry owns one definition per component kind and rejects
duplicates. Extensions can add new kinds without changing the component model.
Component validation is separate from plan construction and never renders or
mutates inputs. Planner remains the only producer of plans and component
instances.

RC7 quality diagnostics are deliberately outside both the Semantic Document
and Document Plan schemas. The analysis receives immutable document and plan
snapshots and returns disposable findings with stable source references. No
diagnostic, summary or rule state is persisted into either model.

## RC7 exclusions

- no theme selection or branding UI;
- no PDF or HTML integration;
- no automated document-improvement processors;
- no branding UI, branding asset loading, templates or visible layout changes.

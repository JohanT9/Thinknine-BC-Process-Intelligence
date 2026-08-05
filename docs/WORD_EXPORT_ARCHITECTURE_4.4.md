# Word Export Architecture 4.4 RC5

## Production flow

```text
current committed Review + Session
  → Review Document Projector
  → validated Semantic Document
  + resolved Thinknine parity theme
  → Document Planner
  → validated immutable Document Plan
  + prepared screenshot media
  → Word Document Adapter
  → DOCX
```

The dashboard is the composition root. It flushes pending annotation saves,
selects the built-in parity theme, invokes the pipeline, loads each referenced
screenshot once, reuses the annotation compositor, validates the media map and
downloads the resulting blob. It contains no document layout decisions.

## Responsibility boundaries

- `review-document-projector.js` translates active Review content into semantic
  content and stable asset references without loading image bytes.
- `document-theme-registry.js` resolves the built-in Thinknine parity appearance.
- `document-planner.js` is the only producer of renderer-neutral plans and owns
  ordering, grouping, visibility and layout intent.
- `word-export-pipeline.js` validates and composes the projector, theme and
  planner boundaries. It also identifies and validates required media assets.
- `word-document-adapter.mjs` maps only a Document Plan and prepared media to
  `docx` objects. It does not know about Review, tasks, history, annotation
  storage, theme inheritance or the registry.
- `word-exporter-docx.mjs` is a build-compatible facade for the adapter.

## Reusable components (RC6)

`document-components.js` defines the stable, immutable and serialization-safe
component contract. `document-component-registry.js` contains one built-in
definition per kind, supports extensions and rejects duplicate kinds.
`document-component-validation.js` checks required semantic content, source
references, accessibility labels, renderer neutrality, theme token references
and capability declarations.

Cover, Header, Footer, Metadata Table, Workflow Section, Step, Screenshot,
Callout, Revision History, TOC and Page Break are explicit reusable components.
Their contracts contain content and intent, never `docx` objects, Word XML,
twips, browser nodes or PDF primitives. Capabilities affect inclusion only in
Planner. The Word adapter only maps already planned components to Word.

The old `word-exporter.js` is retained only as a quarantined compatibility
implementation for isolated tests. It is not loaded by the production dashboard.
`documentation-engine.js` remains a separately tested legacy documentation
engine but its unused dashboard script load was removed. It is not part of the
active Word path.

## Output parity

The Thinknine parity theme and planner content preserve the previous cover,
metadata rows, section order, Swedish headings, step numbering, instructions,
comments, screenshots, annotation composition, expected result, revision table,
header, footer and Word page fields. The adapter retains the previous image
aspect-ratio fitting and does not recompress source image bytes.

No user-visible layout, filename behaviour, Review persistence, screenshot
storage or annotation storage changed in RC5. PDF, HTML, selectable themes,
branding UI and automatic document improvements remain outside this milestone.

## Safety and validation

Semantic documents, resolved themes and plans are validated before rendering.
Every visible screenshot must have valid prepared bytes before a DOCX is built.
Rendering treats its inputs as immutable and verifies that the plan has not been
mutated. Errors reject export before download and never modify Review state or
original screenshot bytes.

## Test strategy

Behaviour tests inspect the generated DOCX package and its document, header,
footer, relationship and style XML. Fixtures cover metadata and content parity,
step ordering, comments, multiple screenshots, annotations, absent annotations,
merge/split/reorder/delete states, Undo/Redo/Cancel snapshots, media failures,
invalid plans and deterministic repeated exports.

Known limitation: Word performs final pagination, so automated tests validate
page-field instructions and structural intent rather than the final page count.
Malformed Reviews without any usable timestamp produce a blank date instead of
introducing a non-deterministic current date.

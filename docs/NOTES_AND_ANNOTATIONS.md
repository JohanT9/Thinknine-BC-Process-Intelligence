# Notes & Annotations

## Distinct documentation models

A Note explains; an Annotation points. They share Review persistence and history
but never share ownership or payload:

- Note prose belongs to a stable documentation owner.
- Annotation geometry and labels belong to exactly one screenshot asset.

Neither model changes Canonical Recording, Step Groups, semantic actions, or
original screenshot bytes.

## Note model

Schema `1.0.0` stores stable `noteId`, recording ID, owner type/ID, note type,
content, visibility, timestamps, creator, provenance, metadata, and preserved
future fields. Supported types are note, information, warning, tip, and
verification. Step ownership is primary; stable section/document ownership is
also representable.

Manual note text is authoritative and bypasses automatic language rewriting.
Hidden notes remain stored; deletion is distinct and Undoable. Empty and
orphaned notes produce diagnostics rather than silent deletion.

A Manual Information Step is standalone document structure. A Note is
supplementary content attached to an existing object.

## Annotation model and geometry

Annotations store stable ID, schema/recording ID, authoritative
`screenshotAssetId`, optional `ownerStepId`, type, normalized geometry, explicit
label/accessibility label, semantic style role, visibility, timestamps,
provenance, metadata, and future fields.

Coordinates are normalized to `[0,1]` in screenshot space, independent of page
zoom, viewport, iframe, renderer, or live Business Central DOM. Supported model
and composition types are rectangle, arrow, highlight, numbered callout, and
text label. Existing Review drawing tools remain optimized for rectangle and
arrow; other types are available through the same domain/composition model.

Style roles—attention, instruction, information, or warning—carry semantics;
themes/renderers own concrete appearance. Labels and numbered callouts require
explicit accessible text.

## Screenshot selection and composition

Annotation presence protects the current screenshot from unsafe automatic or
manual replacement. Annotations remain on screenshot A if a step selects B;
they are never migrated. Original image bytes stay unchanged. SVG/canvas
composition happens only at review/export boundaries and may reuse unchanged
media.

## Merge, split, hide, and manual steps

Merge preserves separate notes from every source identity and preserves every
annotation-to-screenshot relationship. Split assigns ownership only through
stable source/screenshot relationships; ambiguous objects remain preserved with
diagnostics. Hiding a step suppresses its visible notes while leaving note and
annotation objects intact. Manual Information Steps may own Notes and reference
annotated existing screenshots without event IDs.

## History, persistence, and regeneration

Notes and annotations use the existing Review history, autosave, serialized save
queue, and pre-export flush. Creation, content/label edits, move/resize,
visibility, role/type changes, and deletion are ordinary Review commands.

Stable ownership lets both models survive regeneration. Missing owners or assets
are preserved and diagnosed; no array-position reattachment occurs. Existing
Reviews need no migration—the annotation store remains compatible, and legacy
task comments continue through the compatibility projection.

## Renderer parity, accessibility, performance, and privacy

Notes become semantic callouts in the shared Semantic Document. Annotation
references use the same non-destructive composition path for Workspace and Word.
Screen readers receive callout text and annotation labels, never geometry.

Editing is metadata-only and does not renormalize events, regroup steps, reload
unrelated images, invoke Word, or call an external service. Note text and labels
remain local; no AI or automatic visual annotation generation is used.

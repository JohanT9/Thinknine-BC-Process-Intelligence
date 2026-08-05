# Screenshot Annotations 4.3

## RC1 domain foundation

Screenshot annotations are non-destructive Review data. Original screenshot
bytes remain in session screenshot storage and are never included in the
annotation model.

`review.annotations` contains a versioned collection of annotation sets. Each
set belongs to one stable screenshot reference. Coordinates and style sizes are
normalized between zero and one so later SVG and Word renderers can share the
same geometry at different resolutions.

RC1 supports the domain definitions for rectangles and arrows. It provides
stable UUID-based annotation and set IDs, coordinate normalization, validation,
and non-destructive loading of older and future Review data. Unknown annotation
types and unknown schema fields are retained for forward compatibility.

RC1 does not add editing controls, SVG rendering, persistence commands,
Undo/Redo integration, or Word rasterization. Those remain separate milestones.

## RC2 SVG editor

RC2 adds a shared scene model that converts normalized annotation geometry to
the source image's pixel coordinate system. Review Studio uses that scene model
to render non-destructive SVG overlays both in screenshot previews and in a
dedicated editor mode within the existing Review dialog.

Rectangles can be drawn with pointer input. Keyboard users can create a centered
rectangle with Enter and cancel an active gesture with Escape. The editor has a
named toolbar, described drawing region, visible focus, and polite live status.

RC2 changes Review data only in memory until the existing Save command is used.
Undo/Redo integration, annotation autosave, arrows, and Word rasterization are
deliberately reserved for later milestones.

## RC3 arrow and interaction

RC3 adds arrows to the same normalized scene consumed by the SVG renderer.
Arrowheads are calculated in source-image pixel space, which keeps their shape
consistent across image aspect ratios without adding a second geometry engine.

Annotations can be selected on the SVG surface or through an accessible list.
Selected annotations support pointer dragging, one-pixel keyboard movement,
ten-pixel movement with Shift, and deletion. Percentage-based property fields
provide an accessible method for resizing rectangles and changing arrow
endpoints.

Create, update, and remove operations all pass through the annotation domain.
The annotation set revision increments for every committed operation. RC3 still
uses the existing manual Review Save command; command history and autosave are
reserved for RC4.

## RC4 history and persistence

RC4 extends the existing Review command history instead of introducing a
second Undo/Redo engine. Version 2 history entries may contain annotation
snapshots and annotation selection in addition to the existing task snapshots.
Version 1 entries remain readable and retain their previous restore semantics.

Add, move, resize, endpoint, style, and delete commits create history entries.
The domain rejects no-op updates before revision timestamps change. Pointer
drafts remain transient, while consecutive keyboard nudges use a group key and
may become one logical command.

Committed annotation changes use the existing debounce scheduler. A serialized
save queue snapshots each Review request and ensures older writes finish before
newer writes. Response state is applied only when it still represents the
latest unchanged in-memory Review. Editor close, explicit Save, and export wait
for both the debounce timer and the save queue.

Opening the editor captures an annotation and history baseline. Cancel restores
that annotation state while retaining task changes made outside the editor,
then persists it after any earlier queued write. Done flushes persistence and
retains the changes. Original screenshot bytes and Word image rendering remain
untouched.

## RC5 Word rendering

Word export resolves the screenshot paths from the current, non-deleted Review
tasks after pending persistence has been flushed. Each unique annotated image
uses this pipeline:

```text
original screenshot -> normalized scene -> shared SVG descriptors
                    -> SVG overlay -> original-size canvas -> temporary PNG
```

The scene remains the single geometry source for step-card previews, the editor
and export. Shared SVG descriptors define rectangles, arrow lines and
arrowheads for both DOM rendering and serialized export overlays. The DOCX
generator receives ordinary image bytes and remains unaware of annotation
storage.

Composition is sequential to bound transient canvas memory for large exports.
Each screenshot is composed at most once, the canvas backing store is released
after PNG encoding, and source images without supported annotations retain the
previous byte path. Unknown future annotation types are ignored by the scene
and their stored fields remain untouched.

The visual regression test uses deterministic SVG structure and exact scene
coordinates as its approved reference. Browser rasterizers may differ by
anti-aliasing at subpixel edges, so pixel-perfect PNG comparison is deliberately
not used; acceptable variation is limited to edge anti-aliasing while geometry,
colors, dimensions and element ordering must match exactly.

## RC6 release hardening

The final integrity pass prevents Undo/Redo shortcuts in annotation mode from
crossing into task commands that are not visible in that mode. This keeps the
editor baseline, current task state and history index consistent. Escape first
closes the active annotation editor; the outer Review dialog remains available
and focus returns to the originating screenshot action.

The focus trap excludes descendants of hidden editor sections and CSS-hidden
toolbars. Pointer-capture failure and stale keyboard selection are reconciled
without committing partial geometry. Invalid persisted style values fall back
only during scene rendering; the source annotation and all unknown future
fields remain unchanged.

Export image loaders release their event callbacks after settling, dimensions
are validated before canvas allocation, and temporary canvas storage is cleared
on both success and failure. A failed persistence attempt remains recoverable in
memory and is reported if Word generation succeeds from that current state.

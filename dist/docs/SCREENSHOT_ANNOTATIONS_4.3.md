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

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

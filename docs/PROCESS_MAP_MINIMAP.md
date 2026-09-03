# Process Map Minimap

The minimap runtime is included as a top-level dashboard asset in the packaged
extension. Generated-build validation checks that it and every other local
dashboard script referenced by `dashboard.html` exists in `dist`.

Process Overview includes a compact map navigator generated from the same
renderer-neutral layout as the full diagram. Each numbered marker corresponds
to one visible process node and preserves its row and column position.

Selecting a marker updates the shared node detail, scrolls the full diagram to
the corresponding node, and moves keyboard focus to it. The currently selected
Review activity is distinguished with text-independent contrast.

The minimap is navigation only. It does not create a second ProcessGraph,
change layout, alter Review selection, or affect export. Its projection is owned
by `ui/process-map-minimap.js` and remains deterministic for identical layout
and node inputs.

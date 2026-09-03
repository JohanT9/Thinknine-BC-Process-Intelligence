# Process Map Direction

Process Overview supports two deterministic presentation directions from the
same ProcessGraph:

- **Automatic** uses the available width and wraps the flow into readable rows.
- **Vertical** places one process node per row and reads from top to bottom.

The direction selector is located with the map viewport controls. The choice is
stored locally, survives reopening Review Studio, and does not change process
order, semantics, versions, or recording data.

`process-graph-layout.js` owns direction-aware placement intent. Review Studio
passes that intent to its CSS grid and SVG connector renderer. Diagram export
uses one column for Vertical and a bounded four-column layout for Automatic, so
the exported SVG follows the selected presentation.

Both directions retain keyboard order, route labels, swimlanes, semantic node
types, selection, and accessibility information.

# Adaptive Process Graph Layout

BC Process Studio projects every process map through a renderer-neutral layout
stage before Review Studio renders it. The layout keeps process meaning separate
from presentation while avoiding a single, excessively wide horizontal flow.

`process-graph-layout.js` accepts any Process Model-compatible graph and returns:

- stable node placements with row and column coordinates;
- deterministic row groupings;
- horizontal, row-wrap, or orthogonal edge route intent;
- a bounded column count based on available width.

The layout supports `adaptive` left-to-right rows and `vertical` top-to-bottom
flow. Direction changes presentation only; canonical node order is unchanged.

The input graph is never mutated. Nodes keep their semantic identities, source
references, ordering, selection behaviour, and abstraction level. Review Studio
uses the placements to render up to five readable cards per row and a downward
continuation marker between rows. Narrow views use fewer columns automatically,
and resizing or opening Process Overview recalculates the layout.

This is the first layout milestone. The route intent is deliberately independent
of HTML, SVG, BPMN, draw.io, or Visio, enabling later diagram renderers to add
shapes, swimlanes, branching connectors, and themes without changing the
taxonomy or canonical recording.

# Process Map Connector Renderer

Review Studio renders ProcessGraph relationships through a dedicated SVG
connector layer. It measures the final HTML node geometry and translates the
renderer-neutral layout and route intent into paths without changing graph data.

The renderer supports:

- direct horizontal connections;
- orthogonal connections across rows and swimlanes;
- return paths for loops and backwards relationships;
- distinct solid, dashed, dotted, and emphasized relationship treatments;
- arrow markers and forced-colors accessibility.

The SVG is decorative and excluded from the accessibility tree because route
meaning is already present in each source node's accessible label and selected
node details. It does not intercept pointer events. When DOM geometry is not
available, Review Studio retains its CSS arrow fallback.

The connector renderer owns only HTML/SVG translation. Route meaning comes from
ProcessGraph and `process-route-grammar.js`; node placement comes from
`process-graph-layout.js`.

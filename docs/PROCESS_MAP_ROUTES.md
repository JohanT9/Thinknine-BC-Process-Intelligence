# Process Map Routes

Process routes have a renderer-neutral presentation contract in
`document/process-route-grammar.js`. The contract maps canonical relationship
types to route kind, line style, tone, marker intent, and a localized fallback
label. Explicit labels and conditions always take precedence.

Supported route presentations include sequence, branch, conditional branch,
alternative, loop, return, document creation, and document posting. The
contract accepts relationship names from both Process Model and ProcessGraph.

Review Studio exposes meaningful non-sequential routes directly inside their
source node. Decision cards show each condition and destination, while solid,
dashed, dotted, and double accents distinguish route intent. The same route
summary is included in the source button's accessible name. Full route details
remain available in the selected-node detail panel.

This milestone does not infer missing branches or force customer processes into
a reference shape. It renders only relationships already present in the
canonical process projection.

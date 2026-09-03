# Process Map Legend

Every interactive and exported process map includes a compact legend generated
from the map's actual semantic content. It lists only the node shapes and route
line types that occur in the current ProcessGraph.

The legend follows the selected UI or document language and the selected map
theme. This makes a standalone SVG understandable without access to BC Process
Studio while avoiding irrelevant symbols.

`document/process-map-legend.js` owns the renderer-neutral legend projection.
It consumes ProcessGraph plus the existing visual and route grammars. Review
Studio and the SVG adapter render that shared projection independently; neither
renderer infers new process semantics.

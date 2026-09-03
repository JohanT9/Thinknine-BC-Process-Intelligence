# Process Map Swimlanes

BC Process Studio can group process nodes into horizontal swimlanes without
storing presentation details in recordings or taxonomy entities.

`document/process-lane-model.js` creates an immutable lane projection from:

1. explicit Process Model phase containers;
2. semantic `processRole` metadata when no phase owns the node;
3. an unassigned lane only when structured lanes otherwise exist.

The projection contains stable lane IDs, ordered node membership, node-to-lane
assignments, and contiguous lane segments. It never mutates or reclassifies the
source graph. Where no phase or role metadata exists, it returns one implicit
lane marked as not visible so the existing uncluttered map remains unchanged.

Review Studio renders visible lanes as full-width headers followed by their
process nodes. Phase names are no longer repeated inside every node. Cross-lane
continuation uses the same downward flow treatment as multi-row wrapping, and
node selection plus keyboard order remain based on the canonical process order.

Future renderers may use the same contract for vertical role lanes, BPMN pools,
or department-oriented diagrams.

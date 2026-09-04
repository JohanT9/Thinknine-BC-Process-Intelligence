# Process Map Drag Reorder

Semantic Business Process and BC Process maps can be reordered directly by
dragging the handle in a process node. The drop indicator shows whether the
node will be placed before or after the target. The preview updates immediately
and the Review autosave workflow persists the resulting sparse map overrides.

Drag reorder never changes Canonical Recording or taxonomy definitions. User
Procedure remains the factual recorded order and therefore has no drag handles.
The active overridden ProcessGraph is also the input to process versioning and
export, so the saved visual order is preserved in SVG and process JSON.

Keyboard and assistive-technology users can select a node, open **Edit selected
node**, and use **Move earlier** or **Move later**. Color is not the only drop
indicator: position is also represented spatially with a high-contrast edge.

`process-map-drag.js` owns delegated browser drag events. It emits a semantic
move command but does not change models. `process-map-overrides.js` owns the
deterministic immutable reorder operation.

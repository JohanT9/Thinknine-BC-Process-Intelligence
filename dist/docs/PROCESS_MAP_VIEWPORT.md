# Process Map Viewport

Process Overview has independent viewport controls for large process maps. They
do not change Review Workspace zoom, document screenshots, or exported content.

Users can zoom from 60 to 160 percent in ten-percent steps, reset to 100 percent,
or fit the complete rendered map to the available width. Fit calculations round
down to prevent horizontal overflow. The selected level is stored locally and
reapplied when Review Studio is reopened.

`ui/process-map-viewport.js` owns deterministic zoom normalization and fit
calculation. Dashboard owns user preference persistence and orchestration.
Process Overview applies the scale before the SVG connector layer measures node
positions, so connectors remain aligned at every zoom level.

Controls are keyboard-accessible, expose the current percentage through a live
output, disable impossible zoom directions, and use localized shared tooltips.

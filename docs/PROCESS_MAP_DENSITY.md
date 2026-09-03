# Process Map Density

Process Overview supports two presentation densities:

- **Standard** prioritizes comfortable reading and shows full route summaries.
- **Compact** reduces node dimensions, spacing, and secondary metadata so larger
  processes fit into a smaller area without scaling all text as an image.

The selection is stored locally and applies to both the interactive map and SVG
export. Density is a renderer preference only; it never changes ProcessGraph,
recording evidence, relationships, or process order.

Compact SVG export uses deterministic node dimensions and tighter routing gaps.
The automatic legend remains available in both modes.

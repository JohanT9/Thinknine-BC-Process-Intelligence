# Process Map Themes

Process Overview offers three presentation themes without changing process
meaning, node identity, ordering, relationships, or recorded evidence:

- **Business Central** uses the product palette and differentiated semantic colors.
- **Neutral** reduces color intensity for understated customer documentation.
- **Monochrome** uses high-contrast grayscale for printing and formal material.

The theme selector is available beside the map layout controls. The selection is
stored locally for the current browser profile and is applied to both the
interactive Review map and exported SVG diagrams.
Ordinary action nodes also receive theme-specific fills and borders, ensuring
that procedure maps remain visibly different even when they contain no special
document, posting, or decision nodes.

`process-map-theme.js` owns the renderer-neutral theme registry and palettes.
Renderers consume a resolved theme; taxonomy and ProcessGraph never contain
presentation settings. Unknown stored theme IDs safely fall back to Business
Central. Additional themes can therefore be registered without changing a
recording or the process model.

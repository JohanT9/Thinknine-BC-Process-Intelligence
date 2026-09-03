# Process Map Search

Process Overview provides local search across the rendered node titles and
metadata. Search is case-insensitive and accent-insensitive, allowing, for
example, `forsaljning` to match `Försäljning`.

All matches receive a visible highlight. **Next match** or `Enter` advances
through matches cyclically and scrolls the current result into view without
moving keyboard focus away from the search control. `Escape` clears a non-empty
query; in focus mode a subsequent `Escape` closes the map.

Search operates only on the current map projection and never filters, reorders,
or modifies ProcessGraph. Changing abstraction level reruns the current query
against the newly rendered nodes.

# Process Map Focus Mode

Process Overview can be expanded into a focused workspace that uses the full
browser viewport. This is intended for inspecting large branching maps and
swimlanes without losing the current Review context.

The **Focus mode** button opens the existing Process Overview rather than a
second renderer or copied diagram. The same button and `Escape` close it. Focus
is moved into the map when opened and returned to the invoking control when
closed. The button exposes its state through `aria-pressed`.

Focus mode changes viewport presentation only. ProcessGraph, map level, theme,
density, zoom, selection, and export behavior remain unchanged. Body scrolling
is temporarily disabled to avoid competing scroll containers, while the map
workspace remains independently scrollable.

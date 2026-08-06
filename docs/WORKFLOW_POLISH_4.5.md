# Workflow Polish 4.5

## Objective

UX8 reduces friction across Record → Review → Edit → Annotate → Document View →
Documentation Intelligence → Document Library → Batch Operations → Export. It
adds no major capability and changes no document semantics.

## Workflow and information hierarchy

Document Library is the primary retrieval and maintenance surface. The older
session table remains available for raw recording management, ZIP export and
debugging under **Inspelningar och tekniska verktyg**, reducing visual competition
without removing capability. Global status stays outside the disclosure so save
and export feedback is always visible.

Workspace labels are consistently **Granskning** and **Dokumentvy**. Frequent
batch actions remain visible; metadata, archive and permanent delete are grouped
under **Fler åtgärder**. Permanent deletion is named explicitly.

## Interaction and keyboard polish

- `/` focuses and selects Document Library search from the normal dashboard.
- Escape clears a non-empty search and immediately restores all matches.
- Ctrl/Cmd+S uses the same explicit Review save function as both save buttons.
- Existing library Shift/Ctrl/Cmd/Space/Arrow/Home/End shortcuts remain intact.
- Opening a project does not replace its focused card before Review captures
  return focus; closing Review restores focus by stable project ID.
- Hover, focus-visible and disabled states now share consistent visual behavior.
- Export sets accessible busy and progress state and uses calm completion text.
- Reduced-motion preference disables transitions, animation and smooth behavior
  across the complete page rather than selected panels only.

## Performance

Document Library previously rebuilt its normalized search index on every render
and replaced up to 200 card nodes for every selection or arrow-key movement.
UX8 rebuilds the index only after metadata collections change. Search/filter and
sort reuse it. Selection-only changes patch checkbox, selection marker,
`aria-current`, roving tab stop and preview on existing nodes.
The raw-session table creates and retains no row DOM while its secondary
disclosure is collapsed; opening it loads the current lightweight session list.

This is a measured architectural simplification rather than speculative caching:
the immutable index already existed, and UX8 aligns its lifecycle with its input.
The 10,000-record domain regression remains in place; a new view behavior test
verifies incremental selection without HTML replacement.

## Integrity and accessibility

Single-record metadata changes now retain the prior collection until persistence
succeeds and roll back cleanly on failure. Failure to record “recently used” no
longer prevents the requested document from opening.

Native list/listitem and checkbox semantics remain the selection source of truth.
Live result, selection and progress announcements remain polite. Search and save
shortcuts are exposed through `aria-keyshortcuts`. The secondary disclosure and
Fler åtgärder use native `details`/`summary`, preserving keyboard and screen-reader
operation without custom state machines.

## Button audit decisions

- Kept Review save in header and footer because long documents require both
  positions; both now share one implementation.
- Kept direct Tags, Profile and Theme batch actions because they are common
  maintenance tasks and preselect the corresponding explicit field.
- Moved generic Metadata, Archive and Delete into Fler åtgärder because they are
  less frequent or carry higher consequence.
- Kept individual card Favourite and Open actions for rapid single-document work.
- Kept debug and ZIP functionality, but demoted them from the primary hierarchy.

## Known limitations

- The dashboard remains a single composition-root file and warrants future
  modular UI extraction, but UX8 avoids a risky release-time rewrite.
- Batch export can be cancelled before it starts, not between downloads.
- The bounded card view is not virtualized; search is the intended path beyond
  the first 200 matches.
- No cloud sync, collaboration, AI or server-side processing is introduced.

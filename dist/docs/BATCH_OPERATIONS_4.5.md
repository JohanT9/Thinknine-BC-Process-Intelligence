# Batch Operations 4.5

## Purpose

Batch Operations reduce repetitive collection maintenance without weakening
confidence. Operations are explicit, bounded to selected documents and use calm
feedback instead of success dialogs.

## Architecture

The immutable `document-batch-operations.js` domain consumes Document Library
metadata and stable project IDs only. It returns new metadata collections or
side-effect-free export/delete plans. It never imports or receives Review,
Semantic Document, Document Plan, Planner or Word structures. Unknown future
library metadata continues through the existing central normalization path.

Dashboard is the composition root. It owns DOM events, confirmation text,
progress, persistence and invoking existing export/delete services. Metadata
commits retain the previous in-memory collection until storage succeeds and
restore it if persistence fails.

## Selection

- Pointer click selects one card; Ctrl/Cmd and each card checkbox toggle.
- Shift extends from the stable anchor through current visible order.
- Arrow keys and Home/End move logical focus without discarding selection.
- Shift+Arrow extends selection; Space toggles the focused card.
- Ctrl/Cmd+A selects every current search/filter match, including matches beyond
  the 200-card rendering window.
- Escape and Clear Selection clear all selected IDs.
- Filtering and sorting preserve selected IDs, including temporarily hidden
  documents. Deletion reconciliation removes IDs that no longer exist.

The toolbar is contextual and reports the total selection, including hidden
matches. Native checkboxes communicate selection to assistive technology.

## Operations

- **Export** queues separate Word documents and processes one project at a time.
- **Favourite** sets the selected metadata flag without confirmation.
- **Tags, Profile, Theme and Metadata** use one explicit-field command path.
- **Profile** invalidates stale health and activates the assigned expectations
  when that document is next opened.
- **Theme** updates the presentation default without changing content.
- **Archive** is reversible metadata and requires an explanatory confirmation.
- **Delete** permanently removes referenced local sessions and requires an
  irreversible-action confirmation with the exact document count.

Batch operations never modify document content unless the user explicitly
selects a metadata field; even then only metadata changes. Review is preserved
for every operation except intentional permanent document deletion.

## Export integrity and performance

The batch domain creates only an ordered list of project references. After the
user confirms, dashboard loads one project, uses the unchanged Review projection,
annotation compositor, Word Export Pipeline, plan validation and DOCX renderer,
downloads it, then advances. Review is never batch-loaded. Export does not
persist the temporary default Review created for an unreviewed session.

Library search and selection operate on metadata. A behavior test selects and
updates 10,000 records within a conservative local performance budget. DOM
rendering remains bounded to 200 cards while Select All includes every match.

## Accessibility and safety

The contextual toolbar has an accessible name and live selection status.
Progress uses a native named progress element. The metadata editor is a labelled
native dialog; every mutable field has an explicit opt-in checkbox. High contrast
and reduced motion inherit Document Library support. Focus remains logical when
the toolbar disappears or a Review dialog returns to the selected project.

Destructive prompts state affected count, operation and reversibility. Partial
delete or export failures report completed work and reload current metadata so
the interface never claims an all-or-nothing result that did not occur.

## Known limitations

- Batch export creates separate downloads; it does not create a combined file.
- Cancellation is available before export starts, not between individual files.
- Browser multiple-download policy may request additional permission.
- There is no cloud sync, collaboration, automatic merge, AI suggestion or
  server-side processing.
- Archive does not currently hide documents automatically; it is visible
  metadata that can be edited back to Active.

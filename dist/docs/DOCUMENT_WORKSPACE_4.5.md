# Document Workspace 4.5

## Purpose

Documentation Excellence has two first-class workspaces representing the same
document. Review Workspace is the editing surface. Document Workspace is the
read-only reading, inspection and verification surface. Word is a delivery
format rather than the normal place to inspect work in progress.

## Architecture

```text
Review
  → Review Projector
  → Semantic Document
  + Resolved Theme
  → Document Planner and Components
  → Document Plan
      ↘ Document Workspace renderer → DOM view
      ↘ Word Adapter → DOCX
```

`document-workspace.js` consumes only Document Plan and emits an immutable,
serializable workspace model. It has no Review, DOM, browser or Word dependency.
`document-workspace-view.js` maps that model and prepared media to semantic DOM.
`workspace-controller.js` owns switching and revision tracking. Dashboard
orchestrates the pipeline and remains the only composition root.

## Synchronization

Review mutations invalidate a monotonically increasing workspace revision.
Opening Document Workspace renders the latest revision. If Review changes while
media is being prepared, the stale result is discarded and the current revision
is rendered. Sections retain stable IDs; the DOM adapter reuses sections whose
planned content and media revision have not changed.

Screenshots use the same media preparation as Word. Rectangle and arrow
annotations are composed non-destructively from the current Review before media
is passed to either renderer. Original screenshot bytes remain unchanged.

## Accessibility

The workspace selector uses tablist, tab and tabpanel semantics. Left/Right and
Home/End move between workspaces. Selection state, focusability, document sync
status and the read-only document landmark are exposed to assistive technology.
No motion is required for switching.

## Adaptive Document Experience (UX2)

`document-workspace-experience.js` owns immutable presentation state only. It
normalizes zoom, view mode, current page, Adaptive Reading preference and
toolbar layout; calculates fit values; bounds navigation; and persists only
view preferences. It never consumes or modifies Document Plan.

The document toolbar supports Fit Width, Fit Page, 100%, Zoom In, Zoom Out,
Continuous Mode, Page Mode, Previous Page and Next Page. In the document panel,
Home and End move to the first and last logical page, Page Up and Page Down move
one page, and Ctrl+Plus, Ctrl+Minus and Ctrl+0 control zoom. Page changes are
announced through the existing polite live status.

Continuous Mode retains the complete semantic DOM and tracks the current
section during scrolling. Page Mode hides all but the current planned section;
it does not split, clone or rebuild document content. Switching modes preserves
the current logical section whenever possible.

Adaptive Reading is a visual presentation policy. Auto considers available
workspace width, view mode and effective zoom. It may soften the surrounding
background and strengthen page separation and elevation. Advanced settings
allow Auto, Always On or Always Off and an automatic, full or compact toolbar.
None of these settings changes Semantic Document, Theme, Document Components,
Document Plan, Review persistence or Word output.

Zoom, mode, Adaptive Reading and toolbar layout are stored under a dedicated
local preference key. Current page is deliberately session-local so opening a
different document never resumes at an unrelated page.

View changes update CSS, visibility and accessibility state on existing DOM.
They do not rerun projection, theme resolution, planning, component creation,
media composition or workspace rendering. Resize handling and scroll-based
page tracking are limited to one animation frame, and pending frames are
cancelled when Review Studio closes.

## Current boundaries

UX2 does not include thumbnails, free-form page-number entry, print-layout page
breaking, virtualized scrolling or document editing. A logical page currently
corresponds to a planned document section. All editing remains in Review
Workspace. Word export behaviour is unchanged.

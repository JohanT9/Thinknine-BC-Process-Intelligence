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

## UX1 boundaries

UX1 intentionally provides only foundational rendering. It does not include
zoom, fit-width controls, thumbnails, page navigation, virtualized scrolling or
document editing. All editing remains in Review Workspace. Word export behaviour
is unchanged.

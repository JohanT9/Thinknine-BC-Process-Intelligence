# Thinknine BC Process Intelligence 4.2.0 Release Candidate

Release date: 2026-08-04

## Overview

4.2.0 turns Review Studio into a keyboard-accessible, selection-driven editing
workspace. The release adds reusable domain engines for selection, movement,
merge, split and command history while retaining the existing saved-review and
Word-export flows.

## Highlights

- Single, range and multi-selection with pointer and keyboard input.
- Drag-and-drop, toolbar movement and Alt+Arrow reordering through one move
  engine.
- Merge and Split with ordering, screenshots, metadata and audit snapshots
  preserved.
- Undo/Redo for Move, Merge, Split, Delete and Edit, including selection
  restoration and redo-branch invalidation.
- Inline editing through double-click or Enter, Escape cancellation,
  Shift+Enter line breaks and debounced autosave.
- A selection-driven toolbar for Undo, Redo, Merge, Split, Move and Word export,
  with a contextual Delete action on every step.
- A live status bar for steps, selection, estimated pages and screenshots.
- Individual step approval with completion enabled only after every active step
  has been reviewed and approved.
- Modal dialog semantics, focus trapping/restoration, accessible grid state,
  live regions, progress semantics and reduced-motion support.

## Architecture

Review Studio is split into browser/CommonJS-compatible modules under
`src/review/`:

- `review-studio.js` — review domain facade and command recording
- `review-selection.js` — immutable selection reducer and input mapping
- `review-move.js` — ID-based reorder operations and drag/drop adapter
- `review-merge.js` — deterministic merge operation and audit snapshot
- `review-split.js` — text/suggestion split operation and metadata reuse
- `review-history.js` — bounded snapshot-based Undo/Redo engine
- `review-edit.js` — draft lifecycle and autosave scheduler
- `review-toolbar.js` — command definition, state derivation and routing adapter
- `review-status.js` — document metrics and page estimate
- `review-accessibility.js` — modal keyboard and focus management

The dashboard remains the composition root for active-session state, rendering,
persistence and export. Domain transformations are centralized in the Review
modules and use stable task IDs.

## Compatibility and migration

- Existing reviews without command history are upgraded lazily when opened.
- Legacy tasks without IDs receive stable fallback IDs during normalization.
- Existing public Review APIs remain available.
- Existing filename templates and Word-export behaviour are preserved.
- No storage migration or user action is required.

## Installation

From the repository root:

```powershell
npm.cmd ci
npm.cmd run ci
```

Load or reload the generated `dist` directory from `edge://extensions`.
Detailed steps and an RC smoke-test checklist are available in
[`INSTALLERA.txt`](../INSTALLERA.txt).

## Verification

The release suite covers domain operations, command history, selection,
drag/drop, editing, toolbar state, status metrics, accessibility, dashboard
regressions, export settings and DOCX screenshot behaviour. The release gate is:

```text
lint → full behaviour tests → build → generated JavaScript syntax check
```

## Known constraints

- Estimated pages are a deterministic planning estimate, not Word's final
  pagination result.
- Company and user filename variables remain hidden because reliable source
  values are not present in recorded sessions.
- Merge/Split audit history is intentionally separate from interactive
  Undo/Redo history.
- Review orchestration remains in the dashboard; extracting a shared controller
  is deferred until another view needs the same orchestration.

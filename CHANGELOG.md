# Changelog

## 4.3.0 RC6 — Release Hardening

- Excluded controls inside hidden editor sections and CSS-hidden toolbars from
  the focus trap, and made Escape close the editor before Review Studio.
- Prevented annotation-editor shortcuts from undoing hidden task commands and
  corrupting the editor baseline/history relationship.
- Reconciled stale annotation selection during keyboard movement and hardened
  pointer-capture failure handling.
- Added safe rendering fallbacks for invalid persisted annotation styles and
  invalid source-image dimensions without mutating stored data.
- Released image event handlers after load and retained guaranteed canvas
  cleanup for successful and failed exports.
- Added an actionable warning when Word export succeeds from in-memory changes
  that could not be persisted.
- Added focused accessibility, history, rendering and memory regressions.

## 4.3.0 RC5 — Word Annotation Rendering

- Added temporary, non-destructive PNG composition for annotated Word images.
- Reused the normalized annotation scene and shared SVG descriptors for Review
  Studio, the annotation editor and export.
- Preserved source-image resolution, aspect ratio, colors and normalized line
  geometry during rasterization.
- Composed each referenced screenshot once per export and released temporary
  canvases immediately after encoding.
- Kept unannotated screenshots on the previous byte-identical export path.
- Ignored unsupported future annotation types without changing stored data.
- Added rendering, workflow-state, compatibility, cleanup and deterministic
  SVG visual-regression coverage.

## 4.3.0 RC4 — Annotation History and Persistence

- Extended the existing Review command history with optional version 2
  annotation snapshots and stable annotation selection.
- Added Undo/Redo for annotation add, move, resize, arrow endpoints, style and
  delete operations without creating a second history engine.
- Added no-op filtering, redo invalidation and grouped keyboard nudging.
- Added debounced annotation autosave that never persists active gesture drafts.
- Added a serialized save queue and stale-response protection.
- Added persistence flush before editor close, explicit Save and Word export.
- Added editor baselines so Cancel restores annotation state and its history
  without overwriting concurrent task changes.
- Preserved old history entries, unknown future annotations, styles and schema
  fields.
- Added accessible pending, saved and failed persistence status.
- Added annotation history, baseline, save queue, flush and race-condition
  behaviour tests.
- Kept original screenshot storage and Word rendering unchanged.

## 4.3.0 RC3 — Arrow and Annotation Interaction

- Added non-destructive arrow annotations to the shared scene and SVG pipeline.
- Added rectangle and arrow tool selection with accessible pressed state.
- Added annotation selection from the SVG surface and an accessible list.
- Added pointer dragging and pixel-based keyboard movement for annotations.
- Added exact percentage geometry controls for moving and resizing rectangles
  and editing arrow endpoints.
- Added Delete support with live screen-reader feedback.
- Added reusable domain update and remove operations with annotation-set
  revision tracking.
- Added behaviour tests for arrows, selection geometry, movement, update and
  removal.
- Kept annotation Undo/Redo and autosave reserved for RC4.

## 4.3.0 RC2 — SVG Annotation Editor

- Added a shared normalized-to-pixel annotation scene model.
- Added reusable SVG rendering for screenshot annotation overlays.
- Added a Review Studio annotation mode without introducing another modal.
- Added non-destructive rectangle drawing with pointer input.
- Added keyboard rectangle creation with Enter and Escape gesture cancellation.
- Added accessible toolbar, drawing-region descriptions, focus and live feedback.
- Added annotation overlays to Review Studio screenshot previews.
- Added behaviour tests for scene conversion, SVG output and editor gestures.
- Kept Undo/Redo, annotation autosave, arrows and Word rasterization out of RC2.

## 4.3.0 RC1 — Screenshot Annotation Foundation

- Added a versioned, non-destructive screenshot annotation domain model.
- Added stable UUID-based IDs for annotation sets and individual annotations.
- Added normalized rectangle and arrow geometry constrained between 0 and 1.
- Added validation for malformed, invisible and non-finite geometry.
- Preserved unknown annotation types and schema fields for forward compatibility.
- Added backward-compatible normalization for Reviews without annotation data.
- Added behaviour tests for creation, validation, IDs, migration and future data.
- Kept original screenshot bytes, Review UI, Undo/Redo and Word export unchanged.

## 4.2.0 Release Candidate

- Added a blank paragraph between step instructions and comments in Word
  exports.
- Removed the per-step page and confidence metadata line from Word exports while
  retaining those values in review data.
- Added explicit Edit Instruction and Add/Edit Comment controls so inline
  editing no longer depends on discovering double-click or Enter shortcuts.
- Replaced paired instruction emphasis markers such as `**Sök**` with one
  double quote on each side (`"Sök"`) across Review Studio and Word export.
- Removed the overlapping Approve All action; reviews can now be completed only
  after every step has been individually approved.
- Added accessible global and per-step compact/expanded Review Studio controls
  for easier movement through long reviews without changing review data.
- Moved Delete from the global toolbar to an accessible action on every review
  step while retaining Undo and predictable focus restoration.
- Fixed the Review Studio command header so it remains visible while scrolling
  long reviews.
- Fixed session deletion failing before storage removal because the review
  storage prefix was undefined.
- Centralized session, event, screenshot and review storage-key definitions.
- Added visible error feedback when a session cannot be deleted.
- Completed senior release review across architecture, regressions, UX,
  performance and accessibility.
- Removed a dead dashboard renumber branch after all mutations were centralized
  in the Review domain layer.
- Ensured separate committed inline-edit sessions create separate Undo entries.
- Refreshed installation instructions and consolidated release documentation.
- Added complete 4.2.0 release notes and retained compatibility with saved
  reviews and existing public Review APIs.

### RC1 — Selection Foundation

- Added a reusable Review Studio selection model.
- Added single, additive and range selection for review tasks.
- Added keyboard navigation with arrows, Home, End, Enter, Space and Select All.
- Added delegated selection event handling for the review task list.
- Added accessible grid, row and selection state semantics.
- Added stable fallback task identifiers when normalizing legacy reviews.
- Added Review Studio selection behaviour tests.
- Prepared the foundation for future multi-task editing without adding editing
  commands.

### RC2 — Drag & Drop

- Added reusable ID-based move operations for single and multi-selection.
- Added delegated drag-and-drop handling with explicit drag handles.
- Added FLIP animations with reduced-motion support.
- Added Alt+Arrow keyboard reordering.
- Preserved selection and active focus across every move method.
- Routed existing move buttons through the shared move engine.
- Added move, drag lifecycle and animation behaviour tests.

### RC3 — Merge Steps

- Added an ID-based merge engine for selected review tasks.
- Merged instructions, original text, comments, screenshots and source metadata.
- Preserved task ordering by inserting the merged task at the first source task.
- Added versioned review history with indexed source snapshots for future Undo.
- Preserved all merged screenshots in Review Studio and Word exports.
- Added merge-domain, history and DOCX multi-image behaviour tests.

### RC4 — Split Step

- Added a reusable split engine for review tasks.
- Added manual text splitting at the instruction cursor.
- Preserved screenshots, source events and metadata on every split part.
- Added suggestion segments and metadata hooks for future AI integrations.
- Added reversible split history with the complete source snapshot and created
  task IDs.
- Added split-domain, collision, ordering, history and AI-suggestion behaviour
  tests.

### RC5 — Undo / Redo

- Added a reusable, versioned command history engine with a 100-entry limit.
- Added Undo and Redo for move, merge, split, delete and edit commands.
- Added Ctrl/Cmd+Z, Ctrl+Y and Cmd/Ctrl+Shift+Z keyboard shortcuts.
- Preserved task selection across history navigation where command context is
  available.
- Coalesced consecutive edits to the same field into one undoable command.
- Added redo-branch invalidation, no-op filtering and command behaviour tests.

### RC6 — Professional Editing

- Added a reusable inline editing controller for Review Studio fields.
- Added edit activation with double-click or Enter.
- Added Enter-to-commit, Escape-to-cancel and blur-to-commit behaviour.
- Preserved multiline instructions with Shift+Enter while editing.
- Added debounced automatic persistence after committed edits.
- Prevented stale save responses from overwriting newer in-memory edits.
- Kept native text-field Undo/Redo active while an inline editor is open.
- Added editing lifecycle, delegated event and autosave behaviour tests.

### RC7 — Professional Toolbar

- Added a modern, grouped Review Studio command toolbar.
- Added centralized selection-driven state for Undo, Redo, Merge, Split,
  Move Up, Move Down and Export.
- Added reusable ID-based deletion with Undo history support.
- Added boundary-aware movement state for the first and last selected tasks.
- Added delegated command routing and arrow, Home and End toolbar navigation.
- Kept Add, Save and Complete available as secondary actions.
- Added toolbar state, disabled-command, navigation and bulk-delete tests.

### RC8 — Status Bar

- Added a live Review Studio status bar for steps, selection, estimated pages
  and screenshots.
- Added a reusable status model shared by rendering and behaviour tests.
- Updated status automatically after selection and every task-list operation.
- Matched screenshot counting to export semantics by deduplicating per task.
- Added an explicit, documented page-estimation heuristic.
- Added semantic definition-list markup, `role=status`, polite live updates,
  atomic announcements and a grid description relationship.

### RC9 — Accessibility Review

- Added complete modal dialog semantics and accessible naming/descriptions.
- Added a reusable focus trap, Escape handling and opener-focus restoration.
- Moved initial focus into Review Studio when the dialog opens.
- Added accessible progressbar values and dynamic grid row counts/indexes.
- Connected instruction and comment labels to their inline editing controls.
- Added task-specific labels for approval and contextual add actions.
- Added screen-reader keyboard instructions and polite save-status updates.
- Preserved native editing Escape and Undo behaviour inside active fields.
- Added dialog keyboard, focus cycling, handled-event and ARIA regression tests.


## 4.1.1

- Removed the "Always ask where to save files" option and Save As behavior.
- Added a live filename preview.
- Added cursor-aware buttons for process, environment, date, time and version
  variables.
- Deferred company and user variables until reliable session data is available.
- Added validation feedback for unknown filename variables.
- Added validation for missing braces, duplicate opening braces and malformed
  variables without blocking export.
- Added a single variable definition shared by generation, validation and UI.
- Added accessible descriptions, live regions and keyboard navigation.
- Preserved compatibility with existing filename templates.
- Replaced source-string regression checks with export settings behaviour tests.


## 4.1.0

- Added export settings to the dashboard.
- Added option to always show the Edge Save As dialog.
- Added configurable filename pattern.
- Added variables for process, environment, date, time and version.
- Added Edge Downloads API integration.
- Word exports now use the centralized download service.
- Added automatic conflict handling with unique filenames.
- Added export settings regression tests.


## 4.0.1

- Fixed CI failure caused by linting the generated esbuild bundle.
- Style lint now checks only authored source, scripts and tests.
- Generated `dist` output remains validated by build and JavaScript syntax checks.
- Added a regression test for lint scope.


## 4.0.0

- Replaced the hand-written OpenXML Word generator with the established `docx` library.
- Added `docx` 9.7.1 as a runtime dependency.
- Added esbuild bundling for Edge.
- Word documents are now created through `Document`, `ImageRun` and `Packer.toBlob`.
- Preserved Review Studio, screenshots, comments, metadata, headers, footers and page numbers.
- Removed the old custom ZIP/OpenXML Word pipeline from the active dashboard.
- Added build-time checks for the library-based exporter.


## 3.7.3

- Fixed DOCX files that Microsoft Word could not open.
- Preserves actual screenshot MIME type from Edge.
- Detects PNG and JPEG from both MIME metadata and binary signature.
- Stores images with the correct file extension in the DOCX package.
- Adds correct image Content-Type declarations.
- Adds JPEG dimension parsing.
- Added mixed PNG/JPEG DOCX regression tests.


## 3.7.2

- Fixed dashboard startup crash caused by missing `exportWordReview` element.
- Restored the Exportera Word button in Review Studio.
- Made the Word button event binding defensive.
- Added automated HTML/JavaScript ID consistency regression tests.
- Restored settings and session loading by preventing the startup script crash.


## 3.7.1

- Fixed dashboard startup regression.
- Restored loading of environment name and maximum event count.
- Restored session list loading.
- Added guarded sequential dashboard initialization.
- Added defaults fallback when stored settings are missing or unreadable.
- Added explicit empty-session state.
- Hardened background responses for settings and sessions.
- Added dashboard regression tests.
- Word Generator remains unchanged.


## 3.7.0

- Added professional Word DOCX generator.
- Added Exportera Word button in Review Studio.
- Generates cover page, metadata table and table of contents field.
- Generates purpose, prerequisites and reviewed workflow.
- Embeds selected screenshots in the DOCX.
- Includes step comments, expected result and version history.
- Adds Thinknine styling, header, footer and page number fields.
- Word export uses the reviewed task model, not raw events.
- Added browser-compatible ZIP writer.
- Added automated DOCX package tests.


## 3.6.2

- Connected Review Studio visibly to the Sessions page.
- Added a visible Granska button for completed sessions.
- Added a minimal Review Studio overlay.
- Added editable instruction text and approval checkbox.
- Added save and close actions.
- Ensured Review Studio runtime script is loaded in the dashboard.


## 3.6.1

- Made `dist` the permanent Edge development folder.
- Build now synchronizes runtime files from `src`.
- Manifest version is generated from `package.json`.
- Added `VERSION.txt` generation.
- Added Windows build-and-open helper script.
- Build output now prints the exact Edge extension folder.


## 3.6.0

- Added Review Studio.
- Added per-session review storage in Edge.
- Added editable instructions and comments.
- Added approve/unapprove per step.
- Added move up/down.
- Added add/remove manual steps.
- Added review completion and progress.
- Added screenshot previews.
- Added Review button to completed sessions.
- Added review.json model foundation for Word/PDF generation.
- Added Review Studio unit tests.


## 3.5.1

- Added GitHub Actions CI.
- Added automatic tagged release workflow.
- Added dependency-free linting.
- Added Edge ZIP release script.
- Added EditorConfig and Git attributes.
- Added bug and feature issue templates.
- Added pull request template.
- Added project roadmap.


## 3.5.0

- Reorganized project into a git-ready source/dist structure.
- Added modular Noise Filter.
- Added Entity Memory.
- Added Session Graph.
- Added Confidence Engine.
- Added modular Documentation Engine.
- Added Node-based build script.
- Added unit tests with no external dependencies.
- Added session-graph.json and confidence-report.json.
- Kept Edge-only distribution as the primary product path.

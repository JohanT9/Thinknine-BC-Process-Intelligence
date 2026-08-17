# Changelog

## 4.6.0 - Legacy documentation opening compatibility

- Expanded Document View to fill the available review viewport and removed the
  competing fixed-height calculation that could leave half the screen unused.
- Let the document canvas shrink beside guidance without forcing a horizontal
  dialog scrollbar, and stack guidance below the document on narrow screens.
- Render entered item numbers as emphasized values in Document View and Word,
  including consolidated item-number lookup interactions.
- Fixed Document Library opening for recordings whose compatibility projection
  correctly omits empty Canonical `sourceEventIds`.
- Kept legacy evidence source-less instead of fabricating Canonical IDs, while
  making screenshot fallback tolerant of the absent optional reference level.
- Restored the isolated legacy interpreter when modern output is dominated by
  empty `Unclassified` placeholders (at least three and at least 25 percent).
- Automatically regenerate previously saved placeholder-dominated Reviews while
  preserving every Review containing consultant edits, approvals, comments, or
  manual steps.
- Corrected lookup semantics so an explicit selected row number (for example
  customer `905`) wins over earlier lookup search text (for example `iberi`).
- Capture selected row/cell values explicitly for new recordings.
- Recognize Business Central accessibility captions where `Välj posten "905"`
  is embedded after sort metadata, and safely regenerate untouched Reviews that
  previously split this into search-text and row-action steps.
- Consolidate the evidenced legacy item-number triplet (filter entry, embedded
  row action, repeated result) into `Ange 30043 i Artikel Nr` while leaving
  structured lookup selections unchanged.

## 4.6.0 - Architecture, Chromium readiness, and dogfooding baseline

- Re-established one authoritative current architecture and explicitly separated
  Canonical Recording evidence from the canonical Semantic Document domain.
- Added a static Chrome MV3/API compatibility matrix without claiming untested
  Chrome product support.
- Added a 24–30 recording dogfooding plan, operational KPI formulas, freeze-list
  guidance, and explicit not-yet-established product baselines.
- Aligned current README/release wording, package/manifest descriptions, and the
  exported `{version}` filename variable with 4.6.0.

## 4.6 - Screenshot Selection real-world validation

- Expanded the reusable corpus to 20 sanitized, real-shaped BC metadata samples,
  including vendor lookup, option field, multi-frame, annotation-preservation,
  and legacy single-screenshot coverage.
- Added the complete error-classification vocabulary and per-sample determinism
  checks without changing production selection rules.
- Added deterministic golden screenshot expectations and failure classifications.
- Corrected evidenced focus-only, before-value, and late dialog-close choices.
- Established a 14/17 baseline and verified 17/17 eligible automatic selections,
  with capture, ambiguity, and manual cases reported separately.

## 4.6 - Dashboard Composition Root

- Added a DOM-independent canonical session interpretation pipeline.
- Extracted Knowledge Pack matching, scoring, and enrichment from UI orchestration.
- Routed Review preparation and session export through the same domain pipeline.

## 4.6 - Canonical traceability migration

- Made Canonical Event IDs authoritative through normalization, grouping,
  semantic interpretation, Review, Semantic Document, Document Plan, Workspace,
  and Word export.
- Separated legacy `sourceEventNos` as `legacyEventNos` at document boundaries.
- Derived generated Review task identity from stable interpretation evidence.
- Preserved traceability through merge, split, screenshots, and annotations.

## Event → Step Grouping responsibility migration — v4.6

- Moved normalized lookup/focus/result boundaries into Step Grouping.
- Changed Semantic Rules Step Group intake to isolated structured groups.
- Preserved Customer, Item, Vendor, and Quantity interpretation regressions.
- Documented the remaining legacy-only ungrouped compatibility adapter.

## Event Normalization with React/MUI compatibility — v4.6

- Added normalization version 2.0.0 and a compact renderer-neutral taxonomy.
- Added committed typing coalescing and verified focusout value fallback.
- Added open Shadow DOM target resolution and dialog close capture.
- Added full traceability, immutability, determinism, large-recording, and CI tests.

## BC Page / Control / Action Identification — v4.6

- Centralized technical-first Page, Control, Action, and Entity identification.
- Removed primary BC caption/entity/action matching from dashboard composition.
- Added structured Swedish, English, and limited Danish caption fallback.
- Added unknown UI, frame, React/MUI, immutability, determinism, and CI coverage.

## Raw Event Persistence intake authority — v4.6

- Added durable raw intake before BC identification and Canonical Recording.
- Preserved rapid identical interactions unless `sourceEventId` is identical.
- Added explicit max-event truncation and raw-write health diagnostics.
- Added restart, multi-frame, failure, projection, and 20,000-event regressions.

## Canonical Recording Hardening & CI Safety — v4.6

- Added Canonical Recording tests to the standard `npm test` and CI lifecycle,
  with a configuration regression preventing silent removal.
- Formalized immutable input, append-only Event, stable screenshot association,
  schema compatibility, and integrity-diagnostic contracts.
- Added canonical-first screenshot dual-write ordering, bounded finalization,
  queue failure/pending diagnostics, and pre-finish legacy/canonical validation.

## Regenerate From Recording — v4.6

- Added fresh deterministic interpretation orchestration with independently
  recorded pipeline versions and stable Derived Revision fingerprints.
- Added identity/traceability reconciliation for content, screenshots,
  structure, manual information, Notes, hierarchy, and Process Overrides.
- Added structured preview, unresolved-state preservation, atomic commit/
  rollback contract, Workspace Context mapping, and bounded library guidance.

## Process Versioning — v4.6

- Added immutable complete Process Model snapshots with stable identity,
  major/minor labels, explicit parent, baseline, status, notes, and provenance.
- Added semantic fingerprints, duplicate detection, conservative identity/
  traceability matching, and deterministic node/transition/container diffs.
- Added lightweight Document Library version metadata and advisory baseline
  guidance without changing Workspace or Word output.

## Process Model — v4.6

- Added deterministic nodes, transitions, boundaries, phase/subprocess
  containers, and canonical traceability in a renderer-neutral graph.
- Added sparse manual process overrides, explicit branches, orphan preservation,
  separate process order, structured validation, and profile guidance.
- Kept existing Review, Workspace, and Word behavior unchanged.

## Sections / Subtasks — v4.6

- Added immutable Section/Subtask models and sparse Hierarchy Overrides.
- Added exactly-once Step ownership, stable move/reorder, separate recorded and
  presentation order, regeneration/orphan diagnostics, and hierarchy reset.
- Added Review hierarchy navigation/actions and shared Workspace/Word headings.

## Notes & Annotations — v4.6

- Added immutable Note ownership, types, visibility, provenance, orphan and empty diagnostics.
- Formalized screenshot-owned Annotation schema with normalized geometry, labels,
  semantic roles, visibility, provenance, and preserved future fields.
- Added highlight, numbered-callout, and text-label composition alongside rectangle/arrow.
- Integrated notes with Review history and shared semantic Workspace/Word callouts.

## Manual Information Steps — v4.6

- Added versioned manual documentation objects with explicit manual provenance.
- Added stable before/after/section anchors, deterministic unresolved-anchor
  fallback, optional screenshots, semantic callouts, and empty-content validation.
- Integrated manual create/edit/move/hide/delete/merge/split with existing Review
  history, autosave, structural resolution, Workspace, and Word.

## Hide / Merge / Split — v4.6

- Added versioned Step Structure Overrides with deterministic merge/partition IDs.
- Added adjacent-merge validation, exact split-event partition validation,
  structure reset, regeneration/orphan diagnostics, and preserved traceability.
- Integrated structure state with Review Undo/Redo, autosave, and renderer parity.

## Step Editor — v4.6

- Added sparse Step Overrides and deterministic Resolved Steps.
- Added reset, screenshot/annotation safeguards, visibility, provenance,
  orphan diagnostics, and legacy Review projection.
- Reused Review Undo/Redo, autosave, export flushing, and shared rendering.

## 4.6.0 â€” Screenshot Selection Engine

- Added deterministic schema-v1 screenshot selection results with algorithm
  version `1.0.0`, stable input fingerprints, reasons, and rejected candidates.
- Made Step Group source assets the authoritative candidate boundary and added
  primary-event, control/page, field, lookup, toggle, action, stability, profile,
  annotation, and visual-continuity metadata policies.
- Preserved manual Review choices and all conflicting annotated screenshots;
  unavailable manual choices retain the existing candidate set safely.
- Refactored Screenshot Intelligence into a document adapter over the new single
  selection owner while preserving legacy fallback and Workspace/Word parity.
- Added null-selection, duplicate, legacy, future-field, and 5,000-candidate
  performance coverage without image loading, OCR, AI, or computer vision.

## 4.6.0 â€” Event â†’ Step Grouping

- Added deterministic schema-v1 Step Groups with grouping algorithm version
  `1.0.0`, stable source-derived IDs, primary/supporting events, and diagnostics.
- Grouped same-control edit sequences and verified lookup/search/row/result
  round-trips while preserving conservative boundaries for ambiguous relations.
- Added toggle, selection, action, navigation, dialog, row, unknown, page, and
  frame-aware grouping plus ordered screenshot candidate aggregation.
- Classified focus-only and scroll-only mechanics explicitly as non-step noise;
  every other normalized event is assigned exactly once or reported unassigned.
- Added a Step Group entry point for Semantic Interaction Rules while retaining
  legacy consolidation fallback and unchanged Review/Workspace/Word behavior.

## 4.6.0 â€” Event Normalization

- Added immutable schema-v1 Normalized Interaction Events derived from canonical
  raw evidence and BC identification.
- Added deterministic activation, value, selection, toggle, keyboard,
  navigation, focus, lookup, dialog, row-selection, and unknown mechanics.
- Coalesced consecutive input/change/focusout deliveries for the same committed
  value while retaining every contributing canonical source ID.
- Added changed-value focusout fallback for standard and React/MUI inputs,
  focus-only suppression, stable IDs, canonical ordering, and frame/coordinate
  preservation.
- Exposed normalized mechanics to Semantic Interaction Rules while preserving
  legacy fallbacks and unchanged Review, Workspace, and Word behavior.

## 4.6.0 â€” BC Page / Control / Action Identification

- Added immutable schema-v1 identification linked to canonical source events.
- Captured explicit page-route IDs, technical control/action attributes,
  accessible names, state, frame context, and bounded observable UI hierarchy.
- Added conservative field, lookup, option, checkbox, action, repeater, dialog,
  FactBox, subpage, and control-add-in classification with qualitative evidence.
- Preserved localized captions separately from technical identity and retained
  honest unknown results when Business Central exposes no identifier.
- Exposed detached identification metadata to existing processing while keeping
  Review, semantic wording, Document Workspace, and Word behavior unchanged.

## 4.6.0 â€” Raw Event Persistence

- Made Canonical Recording the first durable write for newly accepted events.
- Added source-generated event identities, canonical insertion ordering, frame
  provenance, accessible target metadata, and complete raw payload retention.
- Replaced semantic-similarity deduplication with exact source-delivery
  duplicate protection so legitimate repeated interactions remain evidence.
- Added one serialized canonical writer for event append, delayed screenshot
  association, recovery-safe storage failure handling, and finalization.
- Made stop wait for accepted event and screenshot writes before establishing
  the completed-recording immutability boundary.
- Preserved legacy loading, Review behavior, semantic output, Document Workspace,
  and Word/DOCX output without migration or visible UI changes.

## 4.6.0 R3.2 — Presentation Grammar

- Added a dedicated renderer-neutral Presentation Grammar layer after Language
  Excellence and before Screenshot Intelligence.
- Standardized plain actions, quoted interface elements, bold user values and
  monospace shortcuts or technical identifiers.
- Added deterministic word order for selections, field entry, options and
  semantic checkbox actions without changing workflow meaning.
- Made Document Workspace and Word consume the same immutable presentation runs.
- Preserved legacy marker syntax, unknown future fields and old Reviews without
  migration or persistence changes.
- Added behavior, Workspace, accessibility and DOCX formatting regressions.
- Fixed batch Word export reporting a false failure after a successful download
  when its result contained a non-freezable typed image buffer.

## 4.6.0 R4 — Review Workspace Refinement

- Reduced the primary Review toolbar to Undo, Redo, Save and Word export while
  retaining structural and maintenance commands under More Actions.
- Added keyboard-aware disclosure behavior with Escape restoration, arrow-key
  toolbar navigation and explicit expanded state for assistive technology.
- Improved instruction-editor padding, line spacing, focus visibility, resize
  behavior and nearest-position scrolling.
- Moved exact annotation geometry behind progressive disclosure while retaining
  drawing, selection and deletion controls beside the image.
- Strengthened responsive, forced-colors and reduced-motion behavior without
  adding observers, polling or extra workspace rendering.
- Added R4 regression coverage for toolbar hierarchy, keyboard focus, editing,
  annotation disclosure and responsive/accessibility contracts.

## 4.6.0 R3 — Semantic Interaction Rules Engine

- Replaced isolated consolidation implementations with one immutable,
  renderer-neutral and priority-ordered rules engine after Semantic Document.
- Migrated customer, item and quantity behavior unchanged and added deterministic
  vendor, location, dimension, date, option, checkbox, generic lookup and field
  entry rules.
- Added a stable Semantic Action model preserving raw interactions, source IDs,
  event order, screenshots, annotations and unknown future metadata.
- Added conflict-safe fallback, immutable-revision caching, legacy compatibility
  and shared Document Workspace/Word pipeline integration.
- Added behavior coverage for every built-in rule, priority, fallback,
  determinism, immutability, traceability and future-field preservation.
- Suppressed focus-only field transitions and value-less selection prompts from
  visible documentation while retaining their source trace in semantic output.
- Consolidated a focus/lookup/result sequence into one generic selection and
  retained field steps only when a value was actually entered.
- Fixed recorder deduplication so input and focusout retain distinct provenance,
  and preserved non-empty legacy field values even when only focusout survived.
- Removed the technical `Sortera efter` prefix from generic lookup wording;
  list selection now reads `Välj Nr "136"`.
- Added an isolated screenshot capture policy for non-empty input/change events,
  giving entered values such as quantity 500 their own step screenshot.
- Prevented field-input screenshots from being merged with nearby action or
  different-field captures; focusout-only navigation still captures nothing.
- Aligned Document Workspace text presentation with Review and Word by rendering
  internal `**value**` emphasis as quoted text instead of visible Markdown.
- Added semantic instruction runs: manually entered values render bold, while
  field, page, report and other UI labels continue to render in quotation marks.
- Reused the shared text-format parser in Document Workspace and Word so rich
  presentation does not leak into Semantic Document or stored Review data.

## 4.6.0 — Customer-selection consolidation

- Consolidated adjacent customer field, lookup-helper, record-selection and
  resulting field-update tasks into one business instruction.
- Preferred the explicit selected customer number over masked transitional
  values and retained the final relevant screenshot.
- Preserved all source-event references while preventing unrelated record
  selections, such as item selection, from joining the customer operation.
- Added a behavior regression shaped from the observed five-step customer 1033
  sequence in the latest exported Word document.
- Consolidated the observed item lookup into `Välj artikel "136"`, suppressed
  focus-only fields after the selection and retained the next typed quantity as
  `Ange "500" i "Antal"`.
- Extracted recorder privacy masking so customer, vendor and item settings are
  respected and quantities/dates are no longer irreversibly masked at capture.

## 4.6.0 R1.1 — Dokumentbibliotek terminology

- Renamed the user-facing library entry from Documentation Excellence to
  Dokumentbibliotek while retaining Documentation Excellence as the product name.
- Updated the popup action, dashboard window title, empty state and library ARIA
  names with consistent task-oriented Swedish terminology.
- Replaced the hidden Review product heading and close label with Granskning
  terminology without changing Review behavior or internal architecture names.
- Added terminology, accessible-name, navigation and regression coverage.

## 4.6.0 R2 — Screenshot Intelligence

- Added one renderer-neutral owner for deterministic screenshot candidate
  normalization, evaluation, selection and test-accessible explanations.
- Integrated screenshot selection after Language Excellence and before Document
  Profile presentation planning, shared by Document Workspace and Word.
- Added safe precedence for manual choices and annotations, plus fallback for
  missing, incomplete, equivalent or conflicting candidate metadata.
- Added explainable rules for supported target, stability, transient state,
  dialog, resolution, source-event, near-duplicate, narrative and profile data.
- Added immutable per-revision/profile caching without image bytes, OCR, AI,
  computer vision, DOM, canvas or renderer dependencies.
- Added real-shaped recorder fixtures and behavior coverage for selection,
  compatibility, annotation integrity, caching and renderer parity.
- Recorded that no real persisted Review was available for a non-manufactured
  before-and-after assessment; user-visible success is therefore not claimed.

## 4.6.0 R1 — Language Excellence

- Added a renderer-neutral Language Excellence transformation between Review
  projection and document planning.
- Added one deterministic writing guide for concise, active, precise and
  consistent Swedish and English instruction wording.
- Integrated professional, precise, explanatory, concise and diagnostic tone
  contracts with the five built-in Document Profiles.
- Reused immutable processed output per Semantic Document revision and profile.
- Preserved Review data, document structure, stable IDs, source references,
  screenshots, annotations, unknown fields and renderer behavior.
- Added behavior and compatibility coverage for existing recordings and Reviews,
  terminology, profile tone, semantic preservation, immutability and determinism.

## 4.5.0 UX9 — Production Readiness & Ship Review

- Completed the end-to-end first-time, daily consultant, power-user,
  accessibility, performance, architecture, documentation and recovery review.
- Corrected popup and installation terminology for the shipped Documentation
  Excellence, Document Library, Batch Operations, Granskning and Dokumentvy.
- Moved popup debugging behind a native technical disclosure.
- Added a reusable timeout/single-flight guard so popup polling cannot overlap,
  successful requests release timers and popup teardown clears its interval.
- Grouped dashboard settings in a keyboard-accessible disclosure so Document
  Library remains the clear primary workspace.
- Added v4.5 production-boundary and async-concurrency regression coverage.
- Updated installation verification, v4.5 release notes, production-readiness
  assessment and ship-review evidence.
- Confirmed unchanged Review, Semantic Document, Planner, Documentation
  Intelligence, screenshot and Word export boundaries.

## 4.5.0 UX8 — Workflow Polish

- Made Document Library the primary daily surface and grouped raw sessions,
  ZIP export and debugging under a secondary disclosure.
- Standardized workspace terminology to Granskning and Dokumentvy.
- Added `/` search focus, Escape search clearing and Ctrl/Cmd+S Review saving.
- Reused the library search index until metadata changes instead of rebuilding
  it for selection, filtering and sorting interactions.
- Added incremental card selection/focus/preview updates without replacing card
  DOM, preserving focus and reducing work in large libraries.
- Grouped infrequent and destructive batch controls under Fler åtgärder and
  clarified permanent deletion language.
- Added atomic single-record metadata rollback, non-blocking recent-use
  persistence and correct return focus when opening and closing Review.
- Standardized hover, focus, disabled, busy, reduced-motion and status feedback.
- Added workflow, keyboard, focus, accessibility and render-frequency regression
  coverage without changing document or export semantics.

## 4.5.0 UX7 — Batch Operations

- Added immutable renderer-neutral multi-selection and batch command models.
- Added mouse, Ctrl/Cmd, Shift, Space, arrow, Home/End, Select All and Clear
  Selection workflows with stable selection across filtering and sorting.
- Added a contextual accessible toolbar for Word export, favourites, tags,
  profile, theme, metadata, archive and delete operations.
- Added explicit-field metadata updates with atomic local persistence rollback.
- Added sequential multi-document Word export through the unchanged production
  pipeline, progress announcements and cancellation before processing starts.
- Added clear destructive confirmations and calm Celebrate Progress results.
- Added deterministic 10,000-document, immutability, accessibility, export,
  metadata, profile, theme, archive and delete coverage.
- Kept Review, Semantic Document, Document Plan and document content outside the
  batch domain.

## 4.5.0 UX6 — Document Library

- Added a renderer-neutral, immutable metadata-only Document Library model.
- Added continuous search, combinable profile/theme/health/favourite/recent/date
  filters, six sort orders and profile-aware grouping.
- Added document cards, favourites, recently used documents and a lightweight
  Quick Preview that never opens Review.
- Surfaced qualitative Document Health and Celebrate Progress confirmations
  from already materialized Documentation Intelligence results.
- Added keyboard navigation, screen-reader labels, live result counts,
  high-contrast support and reduced-motion support.
- Added deterministic large-library, discovery, immutability, performance and
  accessibility coverage.
- Kept Semantic Document, Documentation Intelligence, Review persistence,
  screenshot storage and Word export behaviour unchanged.

## 4.5.0 UX5 — Smart Document Profiles

- Added a versioned immutable renderer-neutral Document Profile model and
  extensible registry with future-field preservation.
- Added Business Process, SOP, Training Guide, Quick Reference and
  Troubleshooting Guide built-in profiles.
- Added an accessible profile selector that immediately switches cached theme,
  planned presentation, profile-aware guidance and qualitative Document Health.
- Added profile-specific expectations and deterministic guidance priorities
  without mandatory validation or document mutation.
- Integrated Celebrate Progress confirmations for workflow, screenshots,
  accessibility, metadata, purpose and revision history.
- Preserved Workspace Context, reading position, Review history, Undo and Redo
  across profile switches.
- Kept profile selection outside Review persistence and Word export behaviour.

## 4.5.0 UX4 — Documentation Intelligence

- Added a non-modal Documentation Guidance panel with qualitative Document
  Health, grouped guidance and severity/group filtering.
- Reused immutable Quality Diagnostics from the active document pipeline;
  guidance performs no duplicate validation.
- Added positive advisory wording for recommendations, suggestions, information
  and areas that need attention without numeric quality scoring.
- Connected guidance navigation through Workspace Context to matching document
  and Review locations without editing content.
- Added stable-ID reconciliation so unchanged guidance DOM and focus are reused.
- Added empty-, large-document, deduplication, filtering, immutability,
  determinism, accessibility and renderer-isolation tests.
- Kept export non-blocking and left Word output unchanged.

## 4.5.0 UX3 — Connected Workspaces

- Added immutable Workspace Context as the single source of truth for shared
  section, step, screenshot, annotation, anchor, focus and navigation state.
- Connected Review selection, move, merge, split, delete, Undo and Redo with
  the corresponding Document Workspace location through deterministic rebinding.
- Added keyboard- and pointer-accessible navigation from document sections,
  steps, instructions, screenshots and callouts to their Review step.
- Added context preservation, logical focus transfer, live announcements and
  subtle reduced-motion-aware synchronization feedback.
- Kept both workspaces independent: they publish and observe context only.
- Kept context changes outside projection, planning, components and Word export.

## 4.5.0 UX2 — Adaptive Document Experience

- Added an accessible renderer-neutral document toolbar for fit width, fit
  page, 100%, zoom in/out, view modes and page navigation.
- Added continuous and page reading modes while preserving the current logical
  section whenever practical.
- Added Home, End, Page Up, Page Down and Ctrl-based zoom keyboard navigation
  scoped exclusively to Document Workspace.
- Added automatic Adaptive Reading based on workspace width, mode and zoom,
  with advanced Auto, Always On and Always Off preferences.
- Persisted zoom, view mode, Adaptive Reading and toolbar-layout preferences
  separately from Review persistence.
- Reused the existing document DOM for every view operation; Semantic Document,
  components, planning, diagnostics and Word export remain unchanged.
- Added large-document, resize, persistence, boundary, accessibility and
  pipeline-isolation regression coverage.

## 4.5.0 UX1 — Document Workspace Foundation

- Added Review Workspace and Document Workspace as coordinated first-class
  workspaces with immediate keyboard-accessible switching.
- Added a deterministic, immutable and renderer-neutral Document Workspace
  model that consumes only validated Document Plans.
- Added a read-only DOM adapter for title, metadata, headings, workflow steps,
  instructions, screenshots and composed annotations.
- Reused the exact Review projection, theme, planning and prepared-media path
  used by Word export; Word behaviour remains unchanged.
- Added revision-based synchronization for edit, annotation, move, merge,
  split, delete, Undo and Redo changes with stale-render protection.
- Added stable section reconciliation so unaffected document sections retain
  their DOM nodes whenever practical.
- Added behaviour, determinism, immutability, isolation, synchronization,
  accessibility, theme and incremental-rendering tests.

## 4.4.0 RC9 — Release Hardening & Production Readiness

- Completed an end-to-end consultant workflow, architecture, UX,
  accessibility, performance and regression review without adding features.
- Added accessible live feedback for dashboard and popup status, disclosure
  state for advanced privacy settings and busy state for Word export.
- Avoided repeated unchanged popup DOM updates during recording polling.
- Restricted build-time product-version injection to explicit placeholders so
  internal schema and subsystem versions remain intact in production output.
- Removed redundant session-list rendering work and duplicate visual-comparison
  artifacts from source and generated output.
- Corrected architecture, installation and release documentation to describe
  the final v4.4.0 production path and intentional product boundaries.
- Added release-readiness regression checks for canonical assets, documentation,
  accessibility feedback and production version consistency.
- Verified the complete v4.2, v4.3 and v4.4 behaviour suite, DOCX structure,
  visual snapshots, production build and generated JavaScript syntax.

## 4.4.0 RC8 — Smart Presentation & Professional Layout

- Added professional, renderer-neutral presentation intent for cover, metadata,
  headings, steps, screenshots, callouts, tables and revision history.
- Expanded the Theme System with backward-compatible typography, spacing,
  document, component and semantic-role presentation tokens.
- Improved screenshot emphasis, aspect-ratio preservation, supporting-image
  consistency and grouping without changing screenshot or annotation data.
- Improved section flow using `keepWithNext`, `keepTogether`, row integrity and
  grouping intent, while leaving final pagination to Word.
- Kept the Word adapter renderer-only: it consumes resolved Document Plan values
  and contains no Review, semantic projection or theme resolution logic.
- Preserved existing Reviews, Semantic Documents, themes and legacy Document
  Plans without migration.
- Added behaviour, snapshot, DOCX structure, determinism, immutability,
  repeated-export and legacy-plan compatibility tests.
- Added same-Review RC7/RC8 visual comparison artifacts for the cover and
  workflow presentation.

## 4.4.0 RC7 — Document Quality Diagnostics

- Added renderer-neutral, immutable and serialization-safe document quality
  diagnostics derived from Semantic Documents and Document Plans.
- Added an extensible versioned rule registry with duplicate-ID protection and
  isolated rule execution.
- Added deterministic rules for document structure, steps, screenshots,
  annotations, callouts, metadata and plan consistency.
- Added stable diagnostic IDs, specific source references, locations, suggested
  actions and summaries by severity, rule, section and task.
- Integrated non-blocking quality analysis before Word rendering without adding
  persistence, UI, AI, layout changes or new export formats.
- Added behaviour, immutability, determinism, failure-isolation and Word parity
  regression tests.

## 4.4.0 RC6 — Reusable Document Components

- Added a renderer-neutral, serialization-safe document component contract.
- Added an immutable built-in component registry with duplicate-kind detection
  and extension support.
- Added structural validation for semantic content, source references,
  accessibility metadata, theme token references and capability requirements.
- Made Cover, Header, Footer, Metadata, Workflow, Step, Screenshot, Callout,
  Revision History, TOC and Page Break explicit reusable plan components.
- Moved remaining semantic labels, columns, page-field intent and accessibility
  descriptions out of the Word adapter and into planned component data.
- Preserved the RC5 Word structure and appearance without changing Review data,
  themes, branding UI or export formats.
- Added behaviour, integrity, registry and Word parity coverage.

## 4.4.0 RC5 — Word Adapter Migration with Output Parity

- Migrated the production Word flow to Review projection, the semantic document,
  the resolved Thinknine parity theme, Document Planner and a dedicated adapter.
- Made the immutable Document Plan plus prepared media the adapter's complete
  input boundary.
- Preserved the existing visible Word structure, styling, screenshots,
  annotations, page fields, filename behaviour and image fitting.
- Added validation at every pipeline boundary and actionable failures for
  invalid plans or missing media.
- Quarantined the pre-DOCX compatibility exporter from the production path.
- Added DOCX package and XML parity tests for content, ordering, styles, media,
  annotations, Review history states and deterministic repeated export.
- Kept Review persistence and screenshot storage unchanged; added no PDF, HTML,
  theme-selection UI or other RC6 functionality.

## 4.4.0 RC4 — Document Planner

- Added the immutable, renderer-independent and versioned Document Plan model.
- Added the deterministic Document Planner as the single producer of plans.
- Planned sections, reusable component trees, flow, grouping, placement,
  priority, visibility, page intent, keep intent and spacing intent.
- Consumed resolved theme appearance values and interpreted capabilities without
  rendering or feature mutation.
- Added semantic source references for plan sections, blocks and assets.
- Extended themes with independent `themeSchemaVersion`, immutable origin
  metadata and Semantic Document/Planner compatibility declarations.
- Added plan validation for missing components, consistency, capability
  conflicts, compatibility and invalid references.
- Added Base-theme defaults that keep older themes compatible without migration.
- Added behaviour and integrity tests for planning, themes, serialization,
  future versions and architectural boundaries.
- Kept Word export, Review projection and Semantic Document Model unchanged.

## 4.4.0 RC3 — Document Theme System

- Added an immutable, renderer-independent and versioned document theme model.
- Added tokens for colors, typography, spacing, page values, branding and
  semantic components.
- Added deterministic token references, deep inheritance and explicit overrides.
- Added an immutable theme registry with Base, Thinknine, Minimal and Corporate
  built-in themes.
- Added descriptive theme capabilities without feature-gating behaviour.
- Added validation for required and invalid tokens, duplicate IDs, missing or
  cyclic inheritance, duplicate capabilities and invalid token references.
- Preserved unknown fields, future versions and future capabilities through
  normalization and serialization.
- Added behaviour and integrity tests for themes, registry, inheritance,
  resolution, validation, immutability and compatibility.
- Kept Review projection, semantic documents, layout and Word export unchanged.

## 4.4.0 RC2 — Review Projection

- Added the deterministic Review-to-semantic-document projector.
- Projected Review metadata, active tasks, comments, screenshots, annotation
  references and revision history into semantic sections and blocks.
- Added stable source-derived IDs and generic screenshot assets without loading
  or owning image bytes.
- Added immutable, serialization-safe provenance with one projector version.
- Returned immutable quality diagnostics separately from document content.
- Added compatibility handling for legacy Reviews, missing IDs, malformed
  annotation references and unknown future Review fields.
- Added behaviour and data-integrity tests for projection, deterministic output,
  provenance, references, serialization and future schema preservation.
- Kept Word export, themes, layout and the future Document Planner unchanged.

## 4.4.0 RC1 — Semantic Document Model

- Added a renderer-independent semantic document model with one schema version.
- Added stable IDs for documents, sections, blocks, assets and nested content.
- Added heading, paragraph, step, image, table, callout, list, revision history,
  page-break and TOC blocks.
- Added generic assets and read-only Review source references for tasks,
  screenshots and annotations.
- Added non-mutating normalization, recursive immutability, validation and
  serialization helpers.
- Preserved unknown future properties, assets and well-formed block kinds across
  normalize/serialize/deserialize cycles.
- Added behaviour tests for compatibility, integrity, malformed input,
  references and immutable updates.
- Kept Review persistence, layout planning and Word/PDF rendering unchanged.

## 4.3.0 RC6 — Release Hardening

- Kept the Review header, annotation editor header and tools stacked and sticky
  while scrolling long screenshots.
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
- Added Ctrl/Cmd+Enter-to-commit, Escape-to-cancel and blur-to-commit behaviour.
- Made Enter create natural line breaks in multiline instructions while preserving Enter-to-commit for single-line comments.
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

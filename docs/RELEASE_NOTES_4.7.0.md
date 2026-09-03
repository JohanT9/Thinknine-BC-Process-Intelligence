# BC Process Studio 4.7

- BC Process maps now interleave recognized actions with Business Central
  documents and preserve distinct shapes for documents, process steps, and
  posting actions. Generic registration captions no longer create false
  warehouse actions without supporting context.

- Semantic maps for older recordings now show the recognized domain and
  business process, observed Business Central documents, and visually distinct
  suggested lifecycle steps.

- Business Process and BC Process map levels are now selectable for older
  recordings; Process Analysis loads automatically when a semantic level is
  selected.

- Fixed Process Overview in the installed Edge package by including its minimap
  and search runtimes. The release check now detects any missing local dashboard
  script.

- Process Analysis now distinguishes strong evidence from classifications that
  need confirmation or have insufficient evidence. Its confidence calculation
  uses Business Central metadata, distinct actions, document order, transitions,
  sequence quality, and separation from alternative candidates.
- Older recordings with Swedish purchase captions now resolve to the purchasing
  domain even when their semantic graph is incomplete. Irrelevant references
  with no matching steps are no longer shown, and common process names are
  localized in the Swedish interface.

- Large diagrams now include a compact map overview with numbered, clickable
  nodes for direct navigation to any part of the process.

- Large process maps can now be searched by step, document, or action, with
  highlighted results and keyboard-friendly cyclic navigation.

- Process Overview can now open in a full-viewport focus mode and return to the
  normal Review workspace with the same button or Escape.

- Process maps now support Standard and Compact density. Compact maps fit more
  activities into Review Studio and exported SVG without changing semantics.

- Interactive and exported process maps now include a localized automatic
  legend for the node shapes and relationship lines actually in use.

- Process Overview now offers Business Central, Neutral, and Monochrome visual
  themes. The locally remembered choice is also used by SVG diagram export.
- Theme styling includes ordinary activities, so procedure-only diagrams have
  clearly different fills, borders, backgrounds, and connector contrast.

- Added a canonical Business Central process taxonomy inspired by Microsoft's
  Dynamics 365 end-to-end process catalog and specialized for BC documents,
  pages, actions, warehouse flows, manufacturing, assembly, transfers and
  planning. The immutable registry supports five-level traversal, relationships,
  variants, extensions, and stable recording-to-taxonomy references. See
  [Business Central Process Taxonomy](BUSINESS_CENTRAL_PROCESS_TAXONOMY.md).

- Review Step cards now use a quieter and accessible visual state system.
  Approval and review attention have narrow green/amber accents plus text
  badges, selection uses the product focus colour, and reversible Hide is
  neutral. Updated spacing, numbering and typography improve scanability.

- Review Step cards now prioritize content editing and approval. Secondary
  actions are grouped in a keyboard-accessible menu that closes after use, on
  focus leaving it, or with Escape. Technical confidence and provenance remain
  available under a separate disclosure without cluttering normal review.

- Review Studio no longer exposes manual Section/Subtask creation or a separate
  hierarchy editor. Consultants add missing content directly after the relevant
  Step, reducing structural choices in the normal workflow. Existing Reviews
  with saved hierarchy retain their structure and export compatibility.

- A deterministic pilot-validation gate now turns sanitized real Business
  Central worksheets into transparent product KPIs. It requires at least 24
  recordings and the complete standard BC, language, Aptean and React coverage
  matrix; invalid counts and unsafe customer-data fields fail validation. The
  synthetic automated test verifies the instrument and is explicitly not
  presented as a real product baseline. See
  [Product pilot validation](PRODUCT_PILOT_VALIDATION.md).

- Review Studio can now save immutable process checkpoints and visually compare
  saved versions with each other or with the current Process Model. The
  read-only view highlights added, removed, modified and moved activities plus
  route and observed-state changes. Identical snapshots are not duplicated;
  existing Reviews remain compatible. See
  [Process version comparison](PROCESS_VERSION_COMPARISON.md).

- Process Overview now exports both a deterministic, machine-readable Process
  Model JSON and a standalone accessible SVG diagram. Decisions, alternate
  routes, route labels and observed state changes follow the same validated
  model shown in Review. SVG output excludes raw evidence identifiers, while
  invalid models fail safely before download. See
  [Process and diagram export](PROCESS_EXPORT.md).

- Consultants can now regenerate only selected Review Steps. A scoped preview
  shows instruction and screenshot changes before apply; unselected Steps stay
  byte-for-byte unchanged. Stable identity, safe consultant edits and undo/redo
  are preserved. Merges, splits, removals, approvals and annotated-image
  replacement are blocked instead of crossing the selection boundary. See
  [Selective regeneration](SELECTIVE_REGENERATION.md).

- Review corrections now produce a privacy-safe local feedback signal. It
  records only correction category, affected field categories and count; it
  never contains instruction text, values, captions, identifiers, images,
  company/session data or URLs. Undone changes are excluded, and feedback does
  not automatically alter recordings, existing documents or generation rules.
  The complete boundary is documented in
  [Privacy-safe correction feedback](CORRECTION_FEEDBACK.md).

- Screenshot selection is now measurable and explainable. The immutable result
  includes candidate scores, runner-up margin, a versioned quality level and an
  explicit review recommendation. Review Studio shows a compact localized
  status with an expandable reason and metrics. Manual choices and annotated
  images are identified separately, and scores are never presented as
  statistical confidence. The Review calculation reuses the cached document
  presentation without invoking Word or layout planning.

- Control Add-in and React capture now has an executable real-browser
  validation scenario. Headless Edge runs the production recorder listeners
  against React-shaped controls, capture-phase events stopped by application
  handlers, a labelled checkbox, a changed date field and a nested same-origin
  Control Add-in frame. The gate verifies that the result dialog retains the
  initiating click identity. Customer-specific Business Central origins and
  third-party add-ins remain explicit pilot validation items.

- Semantic consolidation now removes a duplicate visible action when action
  and result evidence carry the same explicit recorder interaction identity
  and action caption. All Capture Packets, source references and screenshot
  candidates remain traceable. Separate user gestures and different business
  actions are never merged, and specific Business Central menu-path rules keep
  priority.

- Verified observed results and observed errors now appear under their owning
  Step in Review Studio, Document Workspace, and Word. They use one Semantic
  Document callout contract and follow the selected language. The editable
  expected result remains separate and is never overwritten by observations.

- **Change image** now updates the screenshot in Review immediately as well as
  in Document Workspace. Both views resolve the same selected asset; a missing
  asset falls back safely instead of leaving an empty card.

- Regeneration can now safely retain edited instructions, rich-text formatting,
  comments, and Step-owned Notes when the original and regenerated Step have an
  exact one-to-one evidence mapping. The preview shows how many edits are kept;
  unsafe ownership still blocks apply.

- Screenshot selection now understands the purpose of the completed semantic
  action. Lookup instructions favor the image showing the choice, verified
  actions favor the visible result, and dialog instructions retain the complete
  dialog before it closes. Existing manual choices and annotations still win.

- Process Model now exposes directly observed before/after differences as versioned,
  renderer-neutral state transitions attached to the responsible activity.
  This establishes the deterministic foundation for state-aware process views
  without guessing business meaning from captions or button names.

- Search/Tell Me recording no longer produces an extra field-entry step after
  the complete search-and-open instruction. The retained step receives the
  actual search phrase from that evidence and keeps the result screenshot.
  Manually edited, approved, or annotated Reviews are never replaced.

- Capture Packets now retain directly observed state before and after an
  interaction. Page changes, committed field values, checkbox state, and dialog
  visibility are represented as traceable facts; only exact comparable values
  become changes, while missing evidence remains explicitly partial.

- Interaction-to-result ownership now has an exact CI oracle across navigation,
  dialogs, errors, accessible status, self-result interactions, adjacent
  actions, React framework noise, and late or orphan outcomes. A late result
  from an older action remains supporting evidence instead of being assigned to
  the wrong newer step.

- Process capture now has a shared, data-driven validation gate in CI. Six
  sanitized recordings exercise seven packets across standard Business Central,
  React Control Add-ins, iframe transitions, and legacy compatibility. The
  report tracks surface coverage, packet completeness, integrity errors, and
  canonical source traceability without modifying recorded evidence.

- Every Capture Packet now passes a shared integrity contract covering recorder
  identity, owned and ordered evidence, screenshot roles, result traceability,
  and completeness. Invalid relationships produce structured diagnostics rather
  than silent repair; the same validator protects runtime and CI fixtures.

- Regeneration previews now fingerprint the complete Review they describe. If
  the Review changes before approval is applied, BC Review Studio safely aborts
  instead of applying an outdated comparison over newer consultant work.

- Accessible Business Central status and confirmation messages now count as an
  observed result for the initiating action. Their visible state is captured
  when screenshots are enabled, while message text remains only in immutable
  Canonical evidence rather than being copied into generated documents.

- In-recording commands such as **Important step**, **Use this image**, **New
  section**, and **Ignore** now follow the complete stable interaction packet.
  React and Control Add-in support events can no longer redirect a marker to the
  wrong documentation step, while historical recordings remain compatible.

- Custom React and Control Add-in surfaces using observable ARIA switches,
  trees, sliders, comboboxes, or presentation wrappers now activate the existing
  enhanced capture mode even without MUI classes or proprietary markers.

- Fixed a Document Library startup error (`Cannot read properties of null`) when
  an open dashboard and the updated extension temporarily use different markup
  versions. The library now opens with safe filter defaults.

## Capture Packet-aware screenshot selection

- Screenshot Selection now uses the stable interaction/result/supporting image
  evidence established by Capture Packets.
- A verified result image is preferred over the initiating action or a later
  transient/supporting capture.
- Manual image choices and annotated screenshots remain authoritative.
- Existing recordings without Capture Packet evidence retain their established
  screenshot behavior and require no migration.

The language architecture now uses one extensible registry. Swedish and English remain the selectable languages while the application is prepared for another fully translated language.

Process recording now assigns an opaque interaction identity at the observable
start of a user action. The identity survives raw persistence, Canonical
Recording, normalization, and Capture Packets so matching results remain with
their initiating action. Existing recordings without the field continue to use
the established deterministic compatibility path; Canonical schema version 1
is unchanged.

Capture Packets now remain intact when React or control-add-in support mechanics
occur between an action and its result. Evidence roles are explicit, verified
result screenshots win over later transient captures, and the complete packet is
available to Semantic Actions and Review tasks. This reduces duplicate or empty
steps without changing historical recording behavior.

## Unified working experience

BC Process Studio now uses one shared Fluent-compatible design system across the
implemented extension surfaces. The result is denser and more task-oriented,
with Business Central-inspired action bars, consistent Knowledge Base cards,
consistent fields and dialogs, full-height review workspaces, visible keyboard
focus, status treatments, reduced-motion support and narrower-window layouts.

This is an independent Thinknine design. It uses no Microsoft logo or Dynamics
product icon and does not imply Microsoft ownership or endorsement.

Version 4.7 introduces the new product identity **BC Process Studio by Thinknine** and positions the application as Business Process Intelligence for Microsoft Dynamics 365 Business Central.

The current journey is expressed through **BC Process Recorder**, **BC Review Studio**, **BC Document Generator**, and **BC Knowledge Base**. Existing recording, review, documentation, Word export, Bug Reporting and local data remain compatible. **BC Process Maps** and broader **BC Process AI** capabilities are named future areas and are not exposed as completed functionality.

The extension manifest, popup, dashboard, diagnostics, installer guidance, release metadata and new document generator attribution use the 4.7 identity. Stable technical identifiers are intentionally retained so existing installations and data continue to work.

## Document language

Process documents can be generated in Swedish or English independently of the
interface language. Settings define the default for new Reviews, and BC Review
Studio provides a per-document choice. Review presentation, BC Document
Generator and Word use the same localized document pipeline. Recorded Business
Central labels, values and manual consultant text remain unchanged.

When stopping a process or issue recording, the naming dialog now confirms the
document language explicitly. BC Knowledge Base displays `SV`/`EN` badges and
can filter by language. The same selection also controls generated Technical
Bug Report headings and local text/Markdown export. No raw event is translated
or rewritten. The language selector remains available after either Swedish or
English interface localization has been applied. The compact recorder dialog
uses full-width fields and clearer vertical spacing so naming and language
selection remain comfortable within the browser popup.

BC Knowledge Base now keeps document cards focused on identity, language,
profile, recency and direct access. The document-health filter and repeated
health checklist have been removed from the library view; underlying quality
metadata remains available to the document pipeline.

Field entry followed immediately by a matching selection from a sorted record
list is now represented as one step. The concise field-entry instruction is
kept, while the later screenshot showing the completed selection becomes the
step image.

The standard CI release gate now executes documentation hierarchy, structural
override, Process Model, Process Versioning and regeneration coverage on every
build. These central process-architecture contracts can no longer pass only in
manually selected milestone test runs.

Review Studio now includes a collapsible Process Overview. It presents the
resolved activity sequence and any evidence-backed before/after state changes
directly from the immutable Process Model, while keeping the detailed step cards
as the primary editing surface. Activities navigate to their corresponding
Review steps, selected steps are highlighted in both representations, and the
overview supports arrow, Home and End keyboard navigation. The sequence is
visualized as a directed, horizontally scrollable diagram with phase and
subtask labels plus a detail panel for the selected activity.

Explicit consultant-defined decisions now appear as distinct selectable nodes.
Their stored route labels and destinations are visible both on the node and in
the detail panel, while the ordinary linear connector is suppressed at the
decision. No branch is inferred from routine UI interactions.

State Observation now retains multiple control changes from the same
interaction, including field values, selected values and toggles. Bounded
status/error outcome presence and deterministic coverage are retained without
copying potentially sensitive messages. Capture Packet Integrity verifies the
coverage, and Process Overview renders boolean transitions as readable On/Off
or På/Av values.
# Guided review navigation

- Use **Next unreviewed** or `Alt+N` to continue from the current position.
- Approved Steps are skipped and the next target is focused and brought into
  view automatically.
- The action reports how many Steps remain and becomes unavailable when the
  review is complete.

# Compact Process Overview

- Process nodes use less horizontal and vertical space while preserving the
  complete process order.
- Each linked node shows whether its Step is reviewed, needs attention or is
  not yet reviewed.
- Selecting a Review Step brings its process node into view; selecting a node
  continues to open the corresponding Review Step.
- State transitions and route evidence remain available in the shared detail
  panel without being repeated inside every node.

# Simpler Document Library

- Search and sorting remain immediately available; secondary filters are
  grouped under **Filters**.
- The filter control reports the number of active filters and provides a single
  reset action without changing the current search or grouping preference.
- Document cards use a compact metadata line, limit long tag collections and
  keep modification information beside the open action.

# Faster recording completion

- The recorder popup and naming dialog have more room for names, language help
  and clear actions.
- **Continue recording**, **Save and stop** and **Delete recording** replace
  ambiguous cancel wording.
- After saving a process recording, **Open documentation** deep-links to that
  exact Review. **Not now** keeps the user in the recorder.

# Responsive and accessible operation

- Dashboard now declares the viewport required for reliable reflow at narrow
  widths and 200% browser zoom.
- Review tabs and toolbars remain operable without clipping; long document and
  process titles wrap instead of overflowing.
- Coarse pointers receive 44-pixel controls, while reduced-motion, increased
  contrast and Windows forced-colour preferences receive explicit treatment.
- Recorder dialogs scroll in short popup windows and expose their help text to
  assistive technology.
- The extension popup keeps a stable 390-pixel working width; responsive rules
  no longer allow the browser's provisional viewport to collapse the layout.

# Contextual tooltips

- Buttons, icon actions and menu summaries show concise tooltips on hover and
  keyboard focus across the primary product surfaces.
- Tooltip text follows the active interface language and uses existing
  accessible labels where available.
- When an action has a keyboard shortcut, the tooltip displays it after the
  action text, for example `Spara (Ctrl+S / Cmd+S)`.
- Tooltips stay inside the viewport and close on pointer exit, focus exit,
  scrolling, resizing or Escape.
- Step action menus now close reliably when their ellipsis button is selected
  again, and opening a different Step menu closes the previous one.
- The ellipsis trigger uses an explicit button and menu state so opening and
  closing no longer depend on Edge's native disclosure timing.
- Selecting the ellipsis trigger no longer enters the command auto-close path;
  the menu remains visible until it is deliberately closed or a command runs.

# Safe structure reset

- Reset Structure no longer replaces existing Review steps with an empty
  generated baseline from older or migrated stored reviews.
- When no valid generated baseline exists, the current steps are retained and
  only the structural overrides are cleared. The operation remains undoable.
- Hidden-state overrides are removed during reset without discarding instruction,
  comment or screenshot edits. A final safety check prevents a non-empty Review
  from resolving to zero visible steps.
- Missing Step IDs no longer match each other. Content overrides are restored
  only when a real shared identity exists and the override belongs to that Step,
  preventing one instruction from being duplicated across the Review.

# Change Image dialog actions

- Capture, Cancel and Apply are grouped directly below the dialog introduction
  and remain visible while the screenshot gallery scrolls independently.
- The dialog title now resolves the visible Step number from the Step identity,
  preventing `step null` headings.

# Document Information placement

- Document Information is available from `Fler åtgärder` in the Review header
  instead of permanently occupying space above the Steps.
- The menu item opens a focused dialog for document language and expected result;
  existing autosave and standard-text reset behaviour is unchanged.

# Semantic Business Central recordings

- Recordings now support an optional semantic interpretation beside unchanged
  technical evidence.
- Several raw UI actions can reference one Business Central Process Step, while
  a single action can describe a document transition such as Open to Released.
- Rule, metadata, AI, and manual classifications retain confidence and provider
  provenance. Manual corrections preserve the previous interpretation in
  history.
- Existing unclassified recordings remain valid and receive an empty semantic
  layer during normalization; no destructive migration is required.

# Business Central process recognition

- Added deterministic recognition of Business Central documents, actions,
  transitions, process sequences, partial processes, and taxonomy variants.
- Recognition prioritizes verified page/table identity, technical actions and
  state transitions. Caption and screenshot interpretation remain weak evidence
  and cannot independently receive high confidence.
- Every candidate includes confidence, contributing Event IDs, signal counts and
  readable reasons; overlapping process candidates remain available as ranked
  alternatives.
- Recognition output can be stored in Canonical Semantic Recording with its
  explanation and alternatives intact. Future AI remains optional and cannot
  replace reliable Business Central metadata.

# Multi-level process diagrams

- The same recording can now produce Business Process, Business Central Process,
  and User Procedure graphs from Canonical Recording, Process Taxonomy, and
  Semantic Classification.
- Semantic Process Steps retain every contributing raw Event and can expand into
  the exact recorded actions. Business Process groups expand into their BC-level
  nodes through stable cross-level identity.
- Added a renderer-neutral ProcessGraph contract for process/document/action,
  decision, system, posting, and manual nodes, plus sequence, branch, loop,
  subprocess, creation, and posting relationships.
- The graph contains no diagram-library or layout fields, enabling future web,
  SVG, PNG, PDF, draw.io, BPMN, and Visio adapters to share one semantic source.

# Business Central document lifecycles

- Added configurable Sales, Purchase, Production, and Transfer document
  lifecycles linked to stable Process Taxonomy document identities.
- Lifecycles support optional stages and No Warehouse, Basic Warehouse,
  Advanced Warehouse, Direct Shipment, Drop Shipment, Make to Stock, and Make to
  Order variants. No warehouse document or activity is assumed universally.
- Typed relationships cover creation, derivation, posting, fulfilment,
  consumption, production, reversal, and return paths. Sales Order state
  knowledge includes Open, Released, Reopened, and Posted transitions.
- Process Recognition now uses matched lifecycle transitions as strong,
  explainable evidence and reports the selected lifecycle variant alongside its
  other signals.

# Reference Diagram Dataset Pipeline

- Added versioned semantic reference datasets with source, asset, concept,
  document, graph, variant, confidence, provenance and verification contracts.
- Added modular extraction/classification interfaces for structured data,
  manual processes, recordings and future image or AI providers.
- Added BC terminology normalization, validation diagnostics, manual override
  history, semantic duplicate detection, graph similarity and reference search.
- Added partition-safe JSON export and ten verified representative Business
  Central graphs without redistributable screenshots or fabricated metadata.

# Process Analysis UX

- Added Process Analysis as a visible Review Studio toolbar action beside
  Document Information, with a compact confidence badge.
- Added an accessible comparison dialog for matched, possible missing and
  customer-specific steps plus alternative reference processes.
- Added manual confirmation and reference selection using the existing Review
  autosave workflow.
- Added responsive Swedish and English presentation and advisory language that
  treats customer deviations as valid possible variants rather than errors.

# Semantic Process Maps

- Added Business Process, BC Process and User Procedure levels to Process
  Overview, all derived from the same recording and semantic analysis.
- BC Process maps now distinguish observed activities, non-blocking reference
  suggestions and customer-specific recorded activities.
- Semantic nodes retain source-event links so observed activities can navigate
  back to corresponding Review steps.
- Added responsive legends, level-specific guidance and keyboard navigation
  without introducing a second diagram renderer.
- Long maps now use an adaptive multi-row layout with clear downward flow
  continuation instead of requiring one long horizontal scroll.
- Process node types now have a consistent visual grammar, allowing consultants
  to distinguish documents, posting, decisions, automated work, manual work,
  and high-level business processes at a glance.
- Decisions and other non-sequential relationships now show their route labels
  and destinations directly in the map, with distinct treatments for
  alternatives, returns, document creation, and posting.
- Existing process phases and semantic roles now appear as horizontal
  swimlanes, reducing repeated labels and making responsibility or phase
  boundaries easier to scan.
- Process relationships are now drawn as real SVG connectors between node
  positions, including orthogonal row transitions, cross-lane flow, branches,
  and backward return paths.
- Process Overview now has its own zoom, reset, and fit-to-width controls, making
  large maps easier to inspect without scaling the surrounding Review content.
- Exported SVG process diagrams now use the same multi-row visual grammar,
  swimlanes, semantic shapes, and relationship styles as Process Overview.
- Users can switch between responsive Automatic layout and a top-to-bottom
  Vertical process map; the selected direction also applies to SVG export.

# Reference Process Library

- Added 35 renderer-free semantic references across Order to Cash, Source to
  Pay, Inventory, Production, Planning, Assembly, and Item Tracking.
- Every reference describes its boundaries, expected and optional documents,
  actions, transitions, variants, and configuration requirements without storing
  screenshots or UI presentation data.
- Recordings can be compared with references to obtain a best match, confidence,
  matched, missing and unexpected steps, plus alternative matches. Differences
  are advisory and may represent a valid customized customer process.
- Namespaced immutable extension libraries allow later Aptean Food & Beverage
  and customer references without changing the core architecture.

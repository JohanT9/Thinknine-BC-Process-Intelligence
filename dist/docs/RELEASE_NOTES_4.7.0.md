# BC Process Studio 4.7

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

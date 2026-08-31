# BC Process Studio 4.7

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
or rewritten.

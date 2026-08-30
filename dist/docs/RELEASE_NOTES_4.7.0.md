# BC Process Studio 4.7

The language architecture now uses one extensible registry. Swedish and English remain the selectable languages while the application is prepared for another fully translated language.

Process recording now assigns an opaque interaction identity at the observable
start of a user action. The identity survives raw persistence, Canonical
Recording, normalization, and Capture Packets so matching results remain with
their initiating action. Existing recordings without the field continue to use
the established deterministic compatibility path; Canonical schema version 1
is unchanged.

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

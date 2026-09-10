# Bug Reporting UX

Bug Reporting is a first-class recording mode beside Process Documentation. From the extension popup, a consultant selects **Report a Bug** once and immediately reproduces the problem in Business Central. Naming is intentionally deferred until Stop, so no title, severity, destination, telemetry, or AI configuration blocks capture.

While recording, text—not color alone—identifies the active mode. Error detection is acknowledged without interrupting the Business Central dialog. Failure to collect diagnostics does not invalidate the recording.

Stopping finalizes the canonical recording, creates a local Bug Report draft with a deterministic evidence-based title, and opens its Technical Report Workspace directly. The title remains editable in the automatically saved report. Process-documentation recordings retain their separate naming and language flow.

The workspace prioritizes editable human context, reproduction, expected result, actual-result context, captured errors, and screenshots. Reproduction wording can be corrected and irrelevant steps excluded in a collapsed inline editor without modifying the captured source events. Excluded steps remain available there and can be included again after saving or reopening. Exact BC error text is visible and copyable. The captured error screenshot is shown first and supporting screenshots are collapsed. Environment, diagnostics, structured/raw AL call stack, objects, telemetry, AI analysis, timeline, and traceability are progressively disclosed under **Technical details**. A readiness message is shown only when required information is missing.

Open report-information, reproduction, screenshot, and technical-detail disclosures retain their open state while edits and autosaves re-render the report.

Edited reproduction wording can be reset to its generated source text. Pressing Enter in a step field commits the change through the same reversible autosave history.

New reports receive an editable title in the document language. When captured
error evidence identifies a reproduction step, its Business Central action,
field, or page supplies the title context. A user-entered title is never replaced.

The main report reads as one continuous document with subtle section dividers. Card borders are reserved for editable input, required attention, and collapsed technical content instead of surrounding every generated section.

Reproduction screenshot captions identify the visible report step they support. Error screenshots keep their explicit error-evidence label.

A collapsed screenshot chooser lets users exclude irrelevant images and restore them later. The choice affects the report and shared package only; captured source assets remain unchanged.

When the user adds context about what happened, that description appears before the exact captured Business Central error in the rendered report and remains present in exports and shared issue packages.

Telemetry, AI analysis, and issue destinations are optional and user-triggered. A useful Markdown/offline report can be created locally. The sharing dialog shows configuration only for the selected destination; raw issue text remains under the optional content preview. External transmission always requires an explicit preview, destination, consent, and create action.

Advanced merge, split, and screenshot-change controls remain in Review; the bug-report workspace intentionally exposes only wording correction and report inclusion.

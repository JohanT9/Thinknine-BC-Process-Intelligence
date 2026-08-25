# Bug Reporting UX

Bug Reporting is a first-class recording mode beside Process Documentation. From the extension popup, a consultant selects **Report a Bug** once and immediately reproduces the problem in Business Central. Naming is intentionally deferred until Stop, so no title, severity, destination, telemetry, or AI configuration blocks capture.

While recording, text—not color alone—identifies the active mode. Error detection is acknowledged without interrupting the Business Central dialog. Failure to collect diagnostics does not invalidate the recording.

Stopping opens a focused naming dialog. Confirming finalizes the canonical recording, uses that name for the session and report, creates a local Bug Report draft, and opens its Technical Report Workspace automatically. Canceling continues recording. Legacy/programmatic flows without a supplied name retain deterministic evidence-based title fallback.

The workspace prioritizes editable human context, reproduction, expected result, actual-result context, captured errors, and screenshots. Exact BC error text is visible and copyable. Environment, diagnostics, structured/raw AL call stack, objects, telemetry, AI analysis, timeline, and traceability are progressively disclosed under **Technical details**.

Telemetry, AI analysis, and issue destinations are optional and user-triggered. A useful Markdown/offline report can be created locally. External transmission always requires an explicit preview, destination, consent, and create action.

Known limitation: reproduction steps are generated from the existing interpretation pipeline, but the full Review editor's merge/split/screenshot-change controls are not embedded in this workspace yet.

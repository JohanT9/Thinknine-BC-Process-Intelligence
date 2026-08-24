# Technical Report Workspace

`technical-report.html?bugReportId=<id>` is a dedicated local workspace. It
loads through existing APIs, projects current domain state and saves through the
existing Bug Report store.

It edits title, summary, severity, category, expected result, human actual result
and notes. One report-owned undo/redo history, explicit save states and
flush-before-export are provided. Resolved reproduction steps and existing Step
Overrides are consumed; merge/split/hide/manual-step ownership stays with the
existing Step architecture.

One error may safely display as primary. With multiple errors no primary is
silently chosen; the user selects it. Additional errors remain visible.

Structured stacks preserve evidence order. Raw stack, diagnostics and unparsed
segments are collapsed read-only details. Copy requires explicit user action.
Error screenshots precede reproduction screenshots. Callers may provide media
already composed by the existing annotation pipeline; original bytes are never
changed.

Untrusted content uses `textContent`, never `innerHTML`. Semantic headings,
labels, status regions, table captions, keyboard-native controls and expandable
details provide the accessibility baseline. Long evidence is wrapped, not
truncated.

The optional Application Insights panel stores public resource configuration,
tests the connection, and refreshes one explicitly selected error. Telemetry
and the derived timeline are read-only, escaped, and exported from the shared
projection. Raw results are collapsed. No issue submission exists. No real
BC/Application Insights pair was available locally; tests use synthetic data.

Optional AI analysis requires broker configuration, exact-host permission,
explicit consent, and an explicit Analyze action. It appears in a separately
labelled read-only section; stale results require explicit re-analysis. Export
excludes AI unless the user selects the dedicated inclusion option. No real AI
provider was available locally; deterministic tests use a synthetic provider.

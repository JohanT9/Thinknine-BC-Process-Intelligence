# Bug Reporting Dogfooding

## Automated representative coverage

The UX regression checks cover mode discoverability, one-action bug start, distinct recording status, error-capture feedback, stop-to-open behavior, silent-bug fallback title, expected-result focus, visible/copyable captured error, collapsed technical details, optional telemetry/AI, issue preview, responsive layout, and preservation of normal documentation recording.

Existing domain suites continue to cover validation/runtime errors, multiple evidence records, diagnostics and partial call stacks, telemetry states, stale AI analysis, local issue packages, provider consent, saves, and exports.

The CI gate also runs a sanitized bug-report scenario corpus through the actual
report service, issue-package projection, and Markdown formatter. Its initial five
flows cover Swedish and English errors, an unmapped technical event after the
acted-on step, a silent problem, and a manual title. New sanitized pilot defects
should first be reduced to this metadata-only format before adding a regression.

## Manual verification status

No live Business Central browser session is available in the automated workspace, so real click counts, error-dialog capture, React/control-add-in capture, and visual long-report behavior were not claimed as manually verified. Pilot verification should cover standard BC errors, a silent problem, an Aptean/control-add-in flow, local-only use, Issue Preview, keyboard navigation, narrow viewports, and long reports.

The Technical Report Workspace now supports the two common reproduction corrections directly: wording changes and removing an irrelevant step from the report. Advanced merge, split, and screenshot replacement remain in Review by design.

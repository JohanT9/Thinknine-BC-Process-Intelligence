# Bug Reporting Dogfooding

## Automated representative coverage

The UX regression checks cover mode discoverability, one-action bug start, distinct recording status, error-capture feedback, stop-to-open behavior, silent-bug fallback title, expected-result focus, visible/copyable captured error, collapsed technical details, optional telemetry/AI, issue preview, responsive layout, and preservation of normal documentation recording.

Existing domain suites continue to cover validation/runtime errors, multiple evidence records, diagnostics and partial call stacks, telemetry states, stale AI analysis, local issue packages, provider consent, saves, and exports.

The CI gate also runs a sanitized bug-report scenario corpus through the actual
report service, issue-package projection, and Markdown formatter. Its 24 flows
cover Swedish and English errors, blocked customers and vendors, credit limits,
warehouse picking and receiving, transfers, production, item tracking,
concurrent updates, permissions, silent problems, and optional Aptean cases.
New sanitized pilot defects should first be reduced to this metadata-only format
before adding a regression.

## Executable YAML scenarios

Run the full sanitized scenario pack with:

```powershell
npm run scenarios:bug-report
```

Run one scenario directly with:

```powershell
node scripts/run-bug-report-scenarios.js scenarios/bug-report/purchase-posting-date.sv.yaml
```

Each YAML file contains both machine-executable recording evidence and a `live`
section with sandbox preconditions, actions, and expected outcome. The automated
runner does not log in to Business Central or claim that the manual path was
executed; it verifies how BC Process Studio handles the declared evidence. Error
messages in synthetic scenarios are representative test inputs. After a manual
sandbox run, preserve the exact Business Central message captured by the recorder
rather than changing production evidence to match the example text.

## Manual verification status

No live Business Central browser session is available in the automated workspace, so real click counts, error-dialog capture, React/control-add-in capture, and visual long-report behavior were not claimed as manually verified. Pilot verification should cover standard BC errors, a silent problem, an Aptean/control-add-in flow, local-only use, Issue Preview, keyboard navigation, narrow viewports, and long reports.

In report sharing, **Include AL call stack when available** is independent from
technical details, telemetry, and AI. It is selected automatically when the
recorded Business Central error contains a call stack. If Business Central did
not expose or the recorder did not capture one, the disabled choice explains
that no call stack is available; the export never invents one.

If a clear Business Central error dialog was retained as a canonical dialog event
but the dedicated error-evidence message was missed, reopening the report performs
a conservative local recovery. The recovered error is linked to the preceding
user action and its screenshot. Recovery requires strong error wording and does
not convert ordinary informational dialogs into errors. Empty technical sections
are not displayed.

The recipient-facing technical view includes useful captured Business Central
environment metadata. Recorder-internal report IDs, event IDs, parser versions,
and canonical trace references stay in the stored report for product support but
are not rendered to ordinary report recipients. A correlation timeline is shown
only when it adds more than the already visible captured error.

Each captured error may include an **Open location in Business Central** link
derived from the URL attached to the error screenshot. The link is restricted to
the official Business Central host and retains only company, page, bookmark, and
dc navigation parameters. It is recipient-facing evidence and is included in the
Markdown issue description. Users must still review the company/record context
before sharing a report outside their organization.

The Technical Report Workspace now supports the two common reproduction corrections directly: wording changes and removing an irrelevant step from the report. Advanced merge, split, and screenshot replacement remain in Review by design.

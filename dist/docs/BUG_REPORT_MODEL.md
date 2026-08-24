# Bug Report domain model

## Root contract

Bug Report has independent `schemaVersion: 1`; it is unrelated to product and
Canonical Recording schema versions. Normalization is immutable, preserves
unknown future fields, supplies safe empty structures, and rejects unsupported
schema versions.

```text
BugReport
  identity: bugReportId, recordingId, schemaVersion, timestamps, status
  summary: title, summary, severity, category (human)
  environment: safe evidence/context metadata
  reproduction.steps[] (derived references)
  expectedResult (human)
  actualResult.human + capturedErrorRefs
  businessCentralError (optional captured/structured evidence)
  diagnostics: rawEvidenceRefs + optional parsed representation
  callStack: rawEvidenceRef + versioned derived frames
  technicalDiagnostics[] (derived)
  evidence: screenshot/diagnostic/attachment references
  notes / annotations (human)
  traceability
  enrichment: future telemetry and non-authoritative analysis
```

Statuses are deliberately limited to `draft`, `ready`, `resolved`, and
`archived`. This is report lifecycle, not an issue tracker workflow.

## Reproduction step reference

Each step contains a stable `reproductionStepId`, order, instruction,
`authorship: derived`, and:

```json
{
  "source": {
    "recordingId": "...",
    "sourceCanonicalEventIds": ["..."],
    "sourceStepId": "...",
    "screenshotAssetIds": ["..."]
  }
}
```

Screenshot evidence roles can be `reproduction`, `error`, `diagnostic`, or
`supporting`. The role is metadata around an existing asset reference; bytes are
not duplicated. Future capture may set an error-role asset or equivalent
`errorScreenshotAssetId` reference.

## Expected and actual result

Expected Result is human-authored and never inferred in this milestone. Actual
Result separates `human.text` from `capturedErrorRef`, allowing both to coexist.
Regeneration never overwrites either source.

## Future Business Central error evidence

When actually observable, a structured captured-error object may contain:

- `errorMessage`, `errorCode`, `timestamp`;
- `internalSessionId`, `applicationInsightsSessionId`;
- `clientActivityId`, `userTelemetryId`, `serverInstanceId`;
- `companyName`, `environmentName`;
- `errorScreenshotAssetId`;
- `rawDiagnosticEvidenceRef`, `callStackEvidenceRef`.

Every field is optional. Missing values remain absent and are never fabricated.
Raw evidence is stored once under a future evidence contract; parsed fields
reference it and do not replace it.

## Diagnostics and AL call stack

Diagnostics distinguish raw evidence references from a future parsed derived
representation. Call stack similarly has a raw evidence reference, `parsed`
flag, and future frames. A future frame may contain only observed/derivable
object type/ID/name, method or trigger, publisher/subscriber context, line
information, and extension/app context.

Raw call-stack sections are captured where browser-observable. Parser version
`1.0.0` derives ordered frames, unknown segments and warnings. Technical
Diagnostics adds structured counts and explicit object/app summaries. Evidence
is stored once and referenced from the report.

## Persistence API

The renderer-neutral store supports save/create, load, list, archive and remove
through an injected adapter. Storage keys use centralized
`t9_bug_report_<bugReportId>`. Removing a report does not remove its recording.

Human-content updates accept summary fields, expected result, human actual
result, notes, annotations and valid status only. Captured and derived evidence
cannot be silently rewritten through that command.

# Bug Recording and Bug Reporting architecture

## End-to-end UX boundary

Bug Reporting starts as a first-class popup action. Stop finalizes the existing recording, derives reproduction through the shared interpretation pipeline, creates the existing Bug Report model, and opens its workspace automatically. Silent problems remain valid reports. Error dialogs add evidence but are not required. Telemetry, AI, and issue submission remain optional explicit downstream actions.

## Architectural position

Bug Reporting reuses the existing recorder and evidence pipeline. There is no
Bug Recorder and no parallel Raw Event store:

```text
Observed interaction
  -> Raw Event Persistence
  -> Canonical Recording (authoritative evidence)
  -> Normalization / Step Grouping / Semantic Interpretation
  -> Documentation Review OR Bug Report reproduction projection
```

Canonical Recording remains generic. A recording has explicit metadata
`recordingPurpose` with the supported values `documentation` and `bug-report`.
The existing session field `purpose` remains human-authored documentation purpose
text and is never reinterpreted as a mode. Missing, legacy, unknown, or invalid
recording-purpose values normalize centrally to `documentation`.

This is an additive schema-version-1 change. It does not justify a Canonical
Recording schema increase because existing persisted data remains valid and the
fallback preserves existing behavior.

## Lifecycle and identities

```text
start bug recording
  -> capture generic Canonical evidence
  -> finish immutable recording
  -> interpret through the shared pipeline
  -> create Bug Report draft referencing the recording
  -> edit human-authored metadata
  -> mark ready / resolved / archived
```

Recording and Bug Report have separate stable identities and lifecycles. The
initial report ID is deterministically `bug-report:<recordingId>`. Deleting or
archiving a Bug Report does not delete its Canonical Recording, Raw Events, or
screenshots.

The application boundary exposes runtime commands for start/finish, draft
creation, load/list, human-content update, archive, and delete. The background
composition root wires browser storage to the renderer-neutral Bug Report store.
Domain modules do not import browser UI, Chrome APIs, Document Workspace, or
DOCX.

## Reproduction and regeneration

Reproduction uses existing normalized events, Step Groups, semantic actions and
derived tasks. The Bug Report creation service receives those derived steps; it
does not regroup events or interpret Business Central behavior independently.

Each reproduction step references the source recording, Canonical Event IDs,
the source derived Step ID, and screenshot asset IDs. Raw events and screenshot
bytes are not copied. Regeneration replaces derived reproduction content while
preserving stable report identity, status, title, expected result, human actual
result, severity/category, notes, annotations, captured error/diagnostics,
call-stack references, enrichment references, attachments and unknown fields.

## Evidence and privacy boundaries

Three origins stay explicit:

- **Captured evidence:** Canonical Events, screenshots, future raw BC error and
  diagnostic evidence, session identifiers and raw call-stack reference.
- **Derived content:** reproduction steps, future parsed diagnostics and future
  structured call-stack frames.
- **Human-authored content:** title, summary, severity, category, expected
  result, actual-result explanation, notes and annotations.

Bug Reports and optional enrichment remain local in `chrome.storage.local`.
Application Insights is queried only after explicit opt-in through Microsoft
Entra PKCE. Optional AI Technical Analysis is a separate derived-enrichment
stage invoked only by explicit user consent through an Entra-protected broker;
it cannot mutate source evidence. Business values, company/user/session identifiers, errors, call
stacks and screenshots may be sensitive. The internal model is therefore not an
external support package. A future sanitization/export policy must explicitly
select and redact data before sharing.

See `AI_TECHNICAL_ANALYSIS.md`, `AI_EVIDENCE_POLICY.md`, and
`AI_PRIVACY_AND_SECURITY.md` for this optional external-analysis boundary.

## Captured BC error evidence

During Bug Recording, the browser detector passively identifies supported BC
error dialogs. The worker persists separate evidence, appends a Canonical
`bc-error` event and associates a fresh error-state screenshot. Bug Reports
reference every occurrence; no primary error is chosen automatically. See
[BC error capture](BC_ERROR_CAPTURE.md) and
[diagnostic evidence](BC_DIAGNOSTIC_EVIDENCE.md).

Raw AL stacks feed a synchronous renderer-neutral parser and Technical
Diagnostics projection. Results are persisted on the Bug Report and can be
re-parsed from unchanged evidence. Parser failure cannot invalidate the report.
See [AL Call Stack Parser](AL_CALL_STACK_PARSER.md) and
[Technical Diagnostics](TECHNICAL_DIAGNOSTICS.md).

Bug Report Generator projects domain state and evidence references into one
renderer-neutral Technical Report consumed by the dedicated local Workspace and
Markdown/plain-text adapters. UI remains an editor/orchestrator; save and export
return to the Bug Report store. See [Bug Report Generator](BUG_REPORT_GENERATOR.md)
and [Technical Report Workspace](TECHNICAL_REPORT_WORKSPACE.md).

## Future extension boundaries

Issue Package and initial Azure DevOps/GitHub creation are now downstream
derived projections. Preview and explicit consent are mandatory; destination
formatting cannot mutate evidence. Lightweight External Issue References are
historical metadata, never a new source of truth. See `ISSUE_PACKAGE.md` and
`EXTERNAL_ISSUE_SECURITY.md`.

- **BC Error Dialog & Copy Details Capture:** implemented for observable modal
  surfaces and already-visible diagnostic DOM, without clipboard permission.
- **AL call stack:** version 1 derives only explicitly present frame fields and
  preserves every unknown segment; it never invents object, app or line data.
- **Application Insights:** optional external evidence is implemented; see
  [Application Insights enrichment](APPLICATION_INSIGHTS_ENRICHMENT.md).
- **AI:** optional analysis consumes selected evidence and produces a separate
  non-authoritative analysis object.
- **Export:** Markdown, offline Issue Package, Azure DevOps, and GitHub consume
  derived report projections. Future Word/PDF support remains separate. The
  domain does not depend on DOCX or destination APIs.

## Self review

- Second recorder created? **No.**
- Canonical Recording authoritative? **Yes.**
- Both purposes use the same evidence pipeline? **Yes.**
- Human-authored content survives regeneration? **Yes.**
- Error capture implemented? **Yes, for documented observable modal surfaces.**
- AL call-stack frame parsing implemented? **Yes, deterministic version 1.0.0.**
- Root-cause assistance implemented? **Optional, non-authoritative AI analysis.**
- Telemetry added? **Optional read enrichment.** AI added? **Optional.**
- External creation added? **Explicit Azure DevOps/GitHub destinations.**

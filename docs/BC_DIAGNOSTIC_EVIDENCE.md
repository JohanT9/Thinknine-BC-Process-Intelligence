# Business Central diagnostic evidence

`BcErrorEvidence` is local captured evidence stored once under
`t9_bc_error_evidence_<errorEvidenceId>`. Bug Reports carry references rather
than duplicating the raw payload.

The model preserves the exact message, raw diagnostics, unknown fields, capture
time, frame context, a preceding Canonical Event candidate, screenshot asset
reference and explicit statuses. URL query values are removed from diagnostic
frame metadata.

The centralized label recognizer extracts only clearly labeled optional values:
timestamp, internal session ID, Application Insights session ID, client
activity ID, user telemetry ID, server instance ID, environment and company.
English, Swedish and Danish labels are recognized. Unknown fields and raw text
remain preserved.

An AL call-stack section is retained as `rawCallStack`. It is never fabricated;
JavaScript stacks are not used. A separate versioned parser derives frames
without changing evidence. See [AL Call Stack Parser](AL_CALL_STACK_PARSER.md).

`diagnostics-unavailable` means BC exposed no observable details.
`diagnostics-capture-failed` means details were advertised but could not be
observed. The distinction survives persistence and Bug Report regeneration.

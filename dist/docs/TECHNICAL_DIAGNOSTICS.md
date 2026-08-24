# Technical Diagnostics

Technical Diagnostics is renderer-neutral derived data built synchronously from
one `BcErrorEvidence` record. It contains the evidence reference, structured
identifiers, versioned parse result, frame counts, explicitly identified AL
objects/apps, first/last frames in evidence order and warning codes.

It contains no explanatory prose, probable ownership, failure location or
root-cause analysis. Namespace, object range and adjacent frames never imply app
ownership.

Derived diagnostics are persisted in the Bug Report and can be recomputed from
the separately stored authoritative evidence using
`T9_REPARSE_BUG_REPORT_TECHNICAL_DIAGNOSTICS`. The complete raw stack remains
stored only in authoritative error evidence;
derived frames retain their own raw frame fragments for traceability. Parser
exceptions become a safe `parser-failure` result so reports still load.

Default debug state contains only parser version, status, counts and warning
codes—not stack content, object names or business data.

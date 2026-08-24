# Bug Report Generator

The generator projects authoritative Bug Report state plus referenced error
evidence into a renderer-neutral Technical Report. The projection is derived and
never the source of truth.

Default order is Summary, Environment, Steps to Reproduce, Expected Result,
Actual Result, Business Central Error, Technical Diagnostics, AL Call Stack,
Referenced AL Objects, optional Application Insights Telemetry, Correlated
Timeline, Screenshots and Evidence, Notes, and Traceability.

Title, summary, severity, category, expected result, human actual-result text and
notes remain editable. Captured messages, diagnostics, screenshots and IDs are
read-only. Parsed frames and object/app summaries are derived. Exact BC wording
is never changed.

An empty title uses the neutral draft display “Business Central error during
recorded process”. A missing summary may show captured error text as a marked
fallback. No business context, severity, category, cause or ownership is
inferred.

Completeness uses explicit required/recommended issues, never a score. Title, a
visible reproduction step and human/captured actual result determine readiness.
Missing BC diagnostics, screenshots and call stacks are advisory.

Markdown and plain text consume this same projection. Issue Package now consumes
the same projection through an explicit preview/privacy boundary; destination
adapters never reconstruct Bug Report semantics.

Word export is deferred because existing Word components do not represent raw
technical-frame semantics cleanly without renderer-specific branching. Document
Library integration is also deferred to avoid duplicating payload or distorting
its current document record contract.

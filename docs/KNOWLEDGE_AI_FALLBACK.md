# Knowledge AI fallback — phase 4 foundation

`src/engine/knowledge-ai-fallback.js` exposes a provider-injected fallback for
unresolved action classification. `src/engine/knowledge-resolution.js` composes the
local repository, optional MCP adapter, and optional AI provider in that order.
Local resolved or ambiguous results are terminal. An MCP suggestion is returned for
review before AI is considered. AI is called only when explicitly instantiated with
`consent: true` and all earlier resolvers remain unresolved.

The provider receives only page/action/field captions, typed page/control identity,
locale, release ID and allowed task/action labels. It receives no recordings,
screenshots, entered values, event sequences, tenant IDs or URLs. Captions are
bounded and common URL, email and long-number patterns are redacted. The structured
response must cite one or more included signal keys and use task/action labels from
the active local release.

All AI results have `status: "suggested"`, no selected candidate, and
`requiresReview: true`. Confidence uses a capped, explicitly uncalibrated model score
(maximum 0.74, with an additional penalty if object identity is absent). The result
does not modify task classification or repository releases. Empirical confidence
calibration belongs to the later feedback stage; current values are review cues only.

There is no knowledge-resolution AI broker endpoint configured in this project. The
existing technical-bug endpoint has a different evidence schema and is not reused.
An approved provider must inject an `invoke` function and obtain consent before this
fallback can make a request. Without it, the resolver returns a reason-coded
unresolved result.

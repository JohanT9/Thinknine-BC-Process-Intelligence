# Knowledge AI fallback — phase 4 foundation result

Added a provider-injected AI suggestion flow for unresolved action classification
and an orchestrator that tries local knowledge, MCP, and AI in that order. The
response is strictly structured, limited to labels from the active release, cites
the supplied signal keys, and remains a review-only suggestion with capped,
uncalibrated confidence. It cannot alter a process classification or publish a
knowledge rule.

The existing AI broker only supports technical bug analysis. No knowledge
resolution endpoint or provider is configured, so the new AI path makes no external
calls until an approved provider and explicit consent are supplied.

Validation completed: Node syntax checks, knowledge-pack import validation, lint,
`git diff --check` and build. Regression tests were not run; automatic review
requires the user to explicitly request test changes or execution.

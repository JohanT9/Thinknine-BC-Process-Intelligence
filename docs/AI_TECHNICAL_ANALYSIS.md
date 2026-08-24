# AI Technical Analysis

AI Technical Analysis is an optional, non-authoritative aid in the Technical
Report Workspace. It summarizes supplied evidence, identifies grounded
observations, labels possible hypotheses, and suggests safe next checks. A Bug
Report remains complete and usable when AI is disabled or fails.

## Architecture

```text
Bug Report + referenced evidence
  -> deterministic bounded Analysis Input
  -> explicit consent and Analyze action
  -> Entra-protected HTTPS broker
  -> provider structured response (no tools, store=false)
  -> citation and object validation
  -> separate derived AI analysis
```

The extension never contains a confidential provider credential. It is an
Entra public client using authorization-code flow with PKCE. The broker validates
the access token and owns the provider credential. Only the configured broker
origin is requested dynamically; tokens remain in service-worker memory.

`TechnicalAnalysisProvider` is renderer-neutral and receives an injected broker
operation. The prompt is centralized and versioned, while model selection stays
provider configuration. The production broker must independently enforce the
schema, size, authentication, authorization, logging, cost, and retention rules.

## Grounding and lifecycle

The analysis records schema/prompt versions, report ID, provider, model,
creation time, source fingerprint, status, summary, observations, hypotheses,
investigation area, next checks, missing evidence, warnings, and disclosure.
Captured evidence, telemetry, deterministic diagnostics, and human content are
never replaced.

Observations require valid evidence citations. Hypotheses require supporting
evidence and render as `Possible root-cause hypothesis` and `Not verified`.
Object references are accepted only if supplied structured frames contain that
object. Unknown citations or invented objects reject the response. Precise
confidence percentages are diagnosed, and AI cannot set confirmed root cause.

Captured evidence is untrusted data, never prompt instructions. The prompt
forbids following instructions embedded in errors, notes, stacks, or telemetry.
Structured validation is the enforcement boundary; prose is not parsed
heuristically.

The deterministic fingerprint covers the exact minimized evidence and policy.
Relevant edits, regenerated reproduction, changed diagnostics, or included
telemetry make analysis stale. Re-analysis is explicit. AI never runs on report
open, error capture, telemetry load, regeneration, or export. Superseded and
cancelled responses cannot overwrite newer evidence.

## Workspace, export, and limitations

AI is displayed in a distinct section and never mixed with evidence or human
notes. Untrusted text uses `textContent`. Users may remove AI without removing
evidence. Markdown and text export exclude AI by default; explicit inclusion is
clearly labelled AI-assisted and non-authoritative.

This milestone does not search the web, fetch AL source, analyze screenshots,
submit issues, execute tools, or remediate systems. Synthetic provider tests
verify the client contract. A real broker/provider requires separate deployment
and pilot verification.


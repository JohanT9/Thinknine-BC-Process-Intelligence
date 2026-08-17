# Dashboard Composition Root

## Boundary

`src/ui/dashboard.js` is the browser composition root. Its active session paths
load data, construct screenshot paths, invoke `T9SessionInterpretationPipeline`,
persist Review state, bind DOM commands, render diagnostics, and orchestrate
exports. Domain interpretation is callable without a DOM or browser extension
API through `src/engine/session-interpretation-pipeline.js`.

Dependency direction:

`dashboard UI → session interpretation pipeline → step groups / semantic interaction / knowledge domain / graph / confidence`

Domain modules never import the dashboard. The pipeline accepts its data and
optional graph/confidence services as arguments, which makes it usable by a CLI,
worker, server, or another UI shell.

## Extracted ownership

- Canonical Step Group → Semantic Action orchestration and Review task projection
  belongs to `session-interpretation-pipeline.js`.
- Knowledge Pack rule normalization, matching, scoring, selection, enrichment,
  unmatched suggestions, and consolidation belong to `knowledge-domain.js`.
- Page/control/action identity, normalized interaction boundaries, and canonical
  traceability continue to belong to their existing dedicated modules.
- Both Review preparation and session ZIP export invoke the same interpretation
  entry point.

ZIP encoding remains in the dashboard. It is stable, UI-export-specific code and
moving it would not improve the domain boundary without first introducing an
independent archive abstraction and focused binary tests.

## Remaining dashboard responsibilities

- Load projects, sessions, settings, knowledge-pack JSON, and screenshots.
- Invoke the interpretation and document/export pipelines.
- Maintain selection and connected Workspace/Review context.
- Bind DOM events and explicit commands.
- Persist settings, Review edits, annotations, and document-library state.
- Surface diagnostics and download export results.

No active BC business interpretation is required by these paths.

## Technical debt

The file still contains legacy interpretation helpers retained for one
compatibility milestone. They are isolated behind the session pipeline's
`compatibilityInterpret` service and run only when modern generated output is
dominated by empty `Unclassified` placeholders (at least three and at least 25
percent). Healthy modern Step Group input never uses this path. Context candidate
construction, pre-canonical event-to-step rules,
process-pattern merges, and legacy Knowledge Pack scoring should be deleted once
legacy recordings have been regenerated or production parity has been observed.
The explicit adapter is technical debt, not a second canonical pipeline.

At this milestone `dashboard.js` changed from 6,525 to 6,399 lines. The small
change is intentional: the metric reflects retained dormant compatibility code,
while active dependency direction is now inverted at the composition boundary.

## Self-review

Would a future non-DOM application shell be able to invoke the same
interpretation pipeline without importing `dashboard.js`? **Yes.**
`tests/composition-root.test.js` does exactly that in Node with no `document`.

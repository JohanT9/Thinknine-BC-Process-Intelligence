# Document Quality Diagnostics 4.4 RC7

## Architecture

```text
Semantic Document + Document Plan
  → immutable rule registry
  → deterministic rule execution
  → immutable findings + summary
```

`document-quality.js` owns the diagnostic model, registry construction, rule
execution, stable diagnostic identity, serialization and summaries.
`document-quality-rules.js` owns the built-in deterministic rules and traversal
of semantic blocks and planned components. `document-quality-validation.js`
validates result shape, severity, identity and summary consistency.

The subsystem never reads Review, renders output, creates Word objects, changes
inputs or proposes automatic modifications. Results are derived and disposable.

## Diagnostic contract

Each finding contains:

- `diagnosticId`: stable rule- and source-derived identity;
- `ruleId`: stable versioned rule identity;
- `severity`: `error`, `warning` or `information`;
- `message` and `suggestedAction`;
- `sourceRef`: the most specific available stable document, section, block,
  task, component, screenshot or annotation reference;
- `location`: an ID-based semantic location, never an array index;
- `details`: deterministic supporting values.

Unknown future diagnostic fields survive normalization and serialization.
Findings are sorted deterministically and identical indistinguishable findings
are deduplicated by stable identity.

## Rule registry and extension

Every rule declares `ruleId`, version, default severity, description, target
type and deterministic `evaluate` function. Duplicate rule IDs are rejected.
Future packages may extend a registry without modifying the diagnostics engine.
One failing rule produces an informational execution finding and cannot prevent
the remaining rules or export from completing.

## Initial rules

The built-in registry covers:

- missing title, purpose, workflow, expected revision history and empty content;
- missing step IDs/source tasks, empty or very short instructions and exact
  normalized duplicates;
- absent screenshots, missing assets/alt text, suspicious repeated use and
  malformed annotation references;
- empty callouts, unsupported semantic roles and accessibility labels;
- environment, reviewer and revision metadata;
- unresolved component sources, hidden required components, capability
  conflicts and semantic blocks missing from the plan.

The short-instruction rule uses a documented fixed threshold of 15 trimmed
characters. Duplicate detection uses exact whitespace-normalized, case-folded
text. Both are language-model-free; findings are advisory and never block.
Repeated screenshot use and absent screenshots are informational to limit false
positive impact.

## Summary

The summary contains total findings, counts by severity and rule, and sorted
stable IDs for affected sections and tasks. RC7 intentionally has no aggregate
quality score because no validated product weighting exists; every finding
remains individually visible programmatically.

## Export integration and limitations

The Word pipeline runs diagnostics after semantic, theme and plan validation.
It returns `qualityDiagnostics` but introduces no new visible UI. Analysis is
fail-open and does not change the DOCX. Review persistence and both document
models remain unchanged.

The Semantic Document contains annotation references, not the complete raw
annotation collection, so RC7 can detect malformed or screenshot-mismatched
references but cannot independently prove that an ID exists in raw Review data.
Likewise, parity fallback metadata already projected as non-empty text cannot be
distinguished from explicitly supplied text without inspecting Review, which
the quality boundary intentionally forbids.

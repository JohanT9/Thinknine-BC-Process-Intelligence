# Documentation Excellence v4.6 R3 — Semantic Interaction Rules Engine

Instructions with `user-edited` provenance pass through semantic rules unchanged.
Reset restores the latest generated semantic instruction.

## Purpose

Semantic Actions remain generated inputs. Structure resolution can reshape their
document presentation but never changes the semantic interpretation itself.

The engine now exposes `processStepGroups` as its primary normalized-recording
entry point. A renderer-neutral adapter maps group structure into the established
rule contract without generating final wording in the grouping layer. Semantic
Actions retain Step Group and canonical source IDs. Existing task-sequence
consolidation remains temporarily available for legacy Reviews and recordings
lacking modern grouping metadata.

Semantic Actions may expose primary mechanics and target context to Screenshot
Selection, but the rules engine never ranks or chooses screenshot assets.

The engine converts deterministic low-level interaction sequences into concise
business actions. It improves representation only: rules never invent values,
change workflow meaning, mutate Review, remove provenance or inspect images.

## Pipeline

```text
Review
→ Review Projector
→ Semantic Document
→ Semantic Interaction Rules Engine
→ Language Excellence
→ Screenshot Intelligence
→ Document Profile / Theme / Planner
→ Document Workspace / Word
```

Existing Reviews require no migration. Older tasks without interaction metadata
pass through unchanged. The existing customer, item and quantity rules were
migrated unchanged; the previous task adapter now delegates to this engine.

## Rule contract and registry

Every immutable rule defines `ruleId`, numeric `priority`, `match(context)` and
`consolidate(context)`. Match only identifies safe candidates. Consolidate
returns one immutable Semantic Action and the exact number of consumed ordered
interactions. Rules are independently testable and deterministic.

The built-in registry orders rules by descending priority:

| Rule | Priority |
| --- | ---: |
| Customer selection | 100 |
| Item selection | 95 |
| Vendor selection | 90 |
| Location selection | 85 |
| Dimension selection | 80 |
| Quantity entry | 75 |
| Date selection | 70 |
| Checkbox enable/disable | 60 |
| Option selection | 50 |
| Generic lookup | 20 |
| Generic field entry | 10 |

Specific rules therefore win over generic rules. If multiple matching rules
share the highest priority, the engine preserves the original interaction
instead of guessing. Invalid rule results also fall back safely.

Focus-only `ChangeField` interactions are represented as suppressed semantic
trace rather than visible steps. A focus transition followed by a deterministic
record selection and matching field result becomes one generic lookup action.
A selection prompt without a selected value is also suppressed. Actual typed
values, option changes and record selections remain visible.

Recorder deduplication includes the input source, preventing a later focusout
from replacing evidence of real input. For backward compatibility, a non-empty
field value remains instructional even when an older recording contains only
focusout provenance. Generic lookup labels remove the technical `Sortera efter`
prefix, producing wording such as `Välj Nr "136"`.

The recorder's separate screenshot capture policy captures non-empty input and
change events but not focusout. Field input cannot reuse a nearby action image
or another field's image, ensuring that a retained value step can reference the
screen state in which its value was entered.

## Semantic Action model

A Semantic Action contains:

- stable `actionId`, `actionType`, rule identity and engine version;
- display text, selected value and target field;
- stable source task IDs, step numbers and ordered event references;
- all screenshot and annotation references;
- cloned raw interactions for complete traceability;
- preserved unknown future semantic-action metadata.

Stable source identities do not depend on workflow position. Original Review,
screenshot bytes and annotation storage are never modified.

## Rendering and language boundaries

The engine exposes all candidate screenshot references but never scores them.
Screenshot Intelligence remains responsible for image selection. Language
Excellence receives Semantic Actions and remains responsible for wording only.
Rules are independent of Document Profiles, themes, planners, Word and the
Document Workspace.

Both visual document inspection and Word export flow through the same semantic
action document and validated Document Plan. This prevents renderer-specific
consolidation and preserves output parity.

## Performance

Only workflow step candidates are scanned. A projected immutable document
revision is processed once and cached by object identity. Profile variants reuse
the same result; a changed Review produces a new projection and cache entry.

## Extension strategy

A future consolidation adds one rule and registers its priority. It requires no
projector, language, screenshot, planner or renderer changes. New rules must
prove their intent deterministically, preserve every source reference and use a
priority distinct enough to avoid ambiguous ownership.

## Compatibility and guarantees

- Existing Reviews require no migration.
- Existing rules were migrated unchanged.
- Traceability is fully preserved.
- Rules never invent information.
- Semantic Actions preserve workflow meaning.
- Unknown future metadata survives processing.
- Suppressed UI mechanics remain available as ordered semantic trace.
- Screenshot Intelligence remains responsible for image selection.
- Language Excellence remains responsible for wording.

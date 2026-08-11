# Process Model

## Purpose and architecture

The Process Model is an immutable, deterministic, renderer-neutral graph above
the resolved documentation hierarchy. It expresses known business-process flow;
it does not replace document organization or canonical evidence.

```text
Resolved hierarchy + traceable actions + sparse process overrides
                              ↓
                    Process Model projector
                              ↓
             graph + structured validation diagnostics
```

The model has no Word, HTML, SVG, Draw.io, BPMN, geometry, XML, DOM, or pixel
fields. Future presentation adapters can consume it without changing semantics.

## Schema, nodes, and transitions

Schema and projection model versions are `1.0.0`. The top level contains stable
model/recording identity, title/description, start/end references, nodes,
transitions, subprocesses, metadata, provenance, timestamps, sparse overrides,
orphaned overrides, and future fields. Unknown fields are retained.

Nodes contain stable identity and type, content, Step/Subtask/Section/Event/
Semantic Action references, manual source references, provenance, separate
recorded/presentation/process order, optional container ownership, metadata, and
future fields. Supported types are `start`, `activity`, `decision`, `end`,
`subprocess`, and `information`.

Transitions contain stable identity, endpoints, type, label/condition, Event
references, provenance, order, metadata, and future fields. Supported types are
`sequence`, `conditional`, `alternate`, `return`, and `unknown`. This deliberately
small taxonomy is not BPMN.

Generated identity hashes stable source identity and model version; array
position is never identity. Equal resolved inputs, model version, and overrides
therefore produce equal models.

## Projection and ordering

A neutral generated Start precedes the first projected node and a neutral End
follows the last. They claim neither a real-world trigger nor business outcome.
Visible recorded/resolved action Steps become activities. Merged Steps become one
activity with all evidence; split Steps may become separate activities. Hidden
Steps do not become visible activities.

Manual `instruction` Steps become manual activities. `prerequisite` and
`information` become information nodes. `verification` becomes an activity only
with explicit `metadata.processActivity`; `warning`, `note`, and `tip` remain
documentation context. Notes never create nodes and annotations never influence
process semantics.

Process order defaults to resolved presentation order. Each activity retains
recorded and presentation order separately. `set-process-order` and `move-node`
overrides can change logical flow without changing chronology or document order.

Sections become phase containers, never executable activities. A Subtask with at
least two projected nodes becomes a bounded subprocess under its phase. Trivial
one-node Subtasks are not over-modeled, and arbitrary deep nesting is unsupported.

Default flow is linear `sequence`. Revisited pages, cancelled dialogs, Back,
Undo, and Yes/No controls do not create loops, decisions, or branches. Decisions
and conditional/alternate/return transitions require explicit consultant process
metadata. Unsupported paths are never invented.

## Overrides, provenance, and regeneration

The sparse override contract covers node rename/type/order/movement, manual
decision/activity/transition creation, generated transition removal,
subprocess creation, and start/end selection. The current projector implements
common node, transition, order, and boundary operations; `create-subprocess` is
reserved for a future editor.

Generated elements use `generated`, manual elements use `manual`, and adjusted
generated elements use `user-adjusted` provenance. Regeneration can improve
untouched generated content while stable-ID manual changes survive. Missing
targets are preserved with a reason and never rebound by nearby position.

## Traceability and validation

Generated activities reference resolved Step, Semantic Action, and canonical
Event IDs. Existing upstream models retain the Step Group and Normalized Event
chain; raw payloads are not duplicated. Manual content has manual source IDs and
no fabricated evidence.

The non-mutating validator reports duplicate identities, orphan transitions,
accidental generated self-loops, missing boundaries, unreachable nodes,
duplicate transitions, unresolved subprocess ownership, broken optional Step
references, and orphaned overrides. Explicit manual cycles are permitted;
generated linear recordings never gain cycles. Documentation Intelligence may
surface diagnostics as advice but does not repair the graph.

## Profiles, planning, and future renderers

Business Process and SOP profiles emphasize process flow; Training Guide uses a
learning sequence; Quick Reference makes overview optional; Troubleshooting
Guide emphasizes evidence-backed branching. Profiles never alter evidence.
Planner stays responsible for presentation, so existing Workspace and Word plans
and output remain unchanged. `outline()` exposes a renderer-neutral verification
view. Future Draw.io, BPMN, Mermaid, SVG, HTML, Word, PDF, or training adapters
can map the same semantics; none is implemented here.

Projection is near-linear, performs no all-pairs inference, and has a 5,000-Step
regression. It is local, uses no AI or external service, mutates no upstream
state, and requires no migration for existing Reviews.

## Historical versions

Process Versioning freezes a complete Process Model snapshot so future projector
or override changes cannot rewrite history. Semantic comparison ignores generated
wording and visual documentation state while retaining graph structure,
provenance, order, containment, and evidence references. See
[PROCESS_VERSIONING.md](PROCESS_VERSIONING.md).

## Regeneration

The current Process Model is freshly projected from regenerated resolved inputs.
Process Overrides retarget through stable source identity or remain unresolved;
historical Process Versions are outside the operation. See
[REGENERATE_FROM_RECORDING.md](REGENERATE_FROM_RECORDING.md).

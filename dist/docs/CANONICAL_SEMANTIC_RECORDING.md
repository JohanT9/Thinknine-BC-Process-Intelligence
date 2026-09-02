# Canonical Semantic Recording

Canonical Recording preserves what happened. Its optional
`semanticInterpretation` layer describes what those immutable interactions mean
in Business Central. The two representations share stable Canonical Event IDs;
semantic processing never replaces, edits, reorders, or removes raw evidence.

## Contract

Every schema-v1 recording normalizes to an empty semantic container when no
classification exists. This makes historical and unclassified recordings valid
without a destructive storage migration.

An active classification contains one or more `sourceEventIds` and optional
references for `businessDomain`, `businessProcess`, `bcProcess`, `processStep`,
`businessDocument`, `businessAction`, `businessEntity`, and `processRole`.
References accept stable IDs and human-readable names without copying taxonomy
definitions. `confidence` is nullable and bounded from zero to one.
`classificationSource` is one of `rule`, `metadata`, `AI`, or `manual`.
Provider, model and prompt provenance can be retained in
`classificationMetadata`.

One classification may reference several events, allowing Search, typing,
navigation, and New to represent one `Create Sales Order` process step. The
reverse is also supported: a single Release event may own a document transition
from Open to Released. Transitions retain document/entity references, before and
after states, confidence, provenance, and all contributing Event IDs.

## Revision and evidence safety

`setSemanticClassification` upserts by stable `classificationId`. Replacing an
AI or rule result with a manual decision moves the previous interpretation to
`classificationHistory`. `setDocumentStateTransition` manages independently
identified transitions. `semanticForEvent` resolves both semantic forms for a
Canonical Event.

Semantic interpretation is derived metadata and can therefore be improved after
capture completion. Completed recording evidence remains immutable: events,
raw payloads, screenshots, recording metadata, and compatibility state do not
change. Integrity diagnostics reject semantic references to missing Event IDs.

```text
Raw Event(s) --stable Event IDs--> Semantic classification --> Taxonomy entities
     |                                  |
     +-- immutable evidence             +-- revisable interpretation + history
```

The semantic model is renderer-neutral and reusable by classification,
documentation, process diagrams, screenshot selection, comparisons, and future
recommendations.

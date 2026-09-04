# Process Map Relationship Editor

Consultants can select a semantic process node and open **Edit connections**.
The editor supports creating, changing, and removing outgoing relationships.
Each relationship has a target node, renderer-neutral type, and optional label.

Supported presentation types include sequence, condition, alternative, loop,
return, document creation, and document posting. The shared route grammar maps
these semantics to localized labels, line styles, colors, and arrow treatment
in both Process Overview and SVG export.

Changes are stored as sparse `processMapRelationshipOverrides`. Applying them
returns a new immutable ProcessGraph and never changes Canonical Recording,
taxonomy entities, or reference processes. Existing and older reviews remain
valid when the override collection is absent.

The editor is available for Business Process and BC Process maps. User
Procedure remains a factual projection of the recorded interaction sequence.

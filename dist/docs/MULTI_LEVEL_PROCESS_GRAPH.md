# Multi-level ProcessGraph

## Purpose

BC Process Studio can project three consistent diagrams from one source chain:

```text
Canonical Recording + Process Taxonomy + Semantic Classification
                              ↓
                         ProcessGraph
            ↙                 ↓                 ↘
 Business Process   Business Central Process   User Procedure
```

No level is an independently authored diagram. Every node retains Canonical
Event IDs, semantic classification IDs, taxonomy entity IDs, and stable child
node IDs where a lower abstraction exists.

## Levels

- `businessProcess` groups the recording by classified Business Process. It is
  intended for management and process ownership.
- `businessCentralProcess` projects classified documents, Process Steps,
  business actions, posting actions, and explicit semantic decisions. It is
  intended for consultants and key users.
- `userProcedure` projects the actual Canonical Events in recorded order. It is
  the traceable operating procedure.

Several Events can belong to one semantic Process Step. The Process Step stores
all `sourceEventIds` and its `childNodeIds` point to the corresponding procedure
nodes. `expand` resolves those children without regenerating or copying raw
evidence. Business Process nodes similarly expand into their classified BC
nodes.

## Renderer-neutral graph

`ProcessGraph` schema version `1.0.0` contains graph identity, recording identity,
level, nodes, relationships, boundaries, metadata, and future fields. It contains
no DOM, SVG, canvas, coordinates, pixels, pages, XML, or diagram-library types.

Supported nodes are:

`start`, `end`, `businessProcess`, `processStep`, `document`, `action`,
`decision`, `systemAction`, `posting`, and `manualAction`.

Supported relationships are:

`sequence`, `branch`, `conditionalBranch`, `loop`, `subprocess`,
`documentCreation`, and `documentPosting`.

Default projection is sequence only. Branches, conditions, loops, subprocesses,
and special document relationships require explicit semantic metadata; UI
mechanics never invent workflow structure. Start and End are neutral generated
boundaries and claim no observed business event.

## APIs and validation

- `generateAll(recording, options)` creates all three graphs and an expansion
  index in one deterministic projection.
- `generate(recording, level, options)` selects one level from that projection.
- `expand(bundle, nodeId)` resolves immediate children at the next lower level.
- `ProcessGraph.validate` detects missing/duplicate identities, orphan
  relationships, and invalid boundaries without repairing the graph.

An injected normalized taxonomy supports partner/customer extensions. Missing
semantic classification produces valid neutral upper-level graphs rather than
inventing meaning. Existing Review Process Model remains unchanged.

Interactive web, SVG, PNG, PDF, draw.io, BPMN, and Visio adapters can consume
the same ProcessGraph in future milestones.

# Semantic Process Maps

## Outcome

Process Overview can present the same recording at three abstraction levels:

- **Business process** summarizes the identified domain and process for process
  owners and management.
- **BC process** combines the verified reference graph with observed recording
  evidence for consultants and key users.
- **User procedure** preserves the actual recorded Review steps.

The level selector is always located above the map. Keyboard users can move
between available levels with Left, Right, Home and End.

## Semantic statuses

BC process nodes have explicit text and visual states:

- **Observed** — reference activity supported by the recording.
- **Reference suggestion** — expected reference activity not observed in the
  recording. It is presented with a dashed border and is not treated as an
  error.
- **Customer-specific** — additional recorded activity such as a custom
  approval.
- **Reference** — contextual reference activity without enough evidence for a
  stronger status.

The legend is visible only for semantic maps. Color is never the sole carrier of
meaning. Where source-event traceability exists, selecting a semantic node opens
the corresponding Review step.

## Architecture

`semantic-process-map.js` is a pure renderer-neutral projector. It consumes:

```text
Canonical Recording ProcessGraph
+ confirmed reference ProcessGraph
+ Process Analysis comparison
+ Review task traceability
```

It produces the existing Process Model-compatible map contract consumed by
`process-overview-view.js`. The existing renderer, navigation and export
infrastructure are reused; no parallel diagram renderer was introduced.

Reference suggestions never modify the Canonical Recording or Review tasks.
Switching map level changes presentation only. User Procedure remains the source
of truth for what was actually recorded.

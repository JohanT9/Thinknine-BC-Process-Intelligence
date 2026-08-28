# Recording Guidance

The in-page recording panel offers four optional commands for the most recently
captured interaction:

- **Important step** preserves explicit importance metadata.
- **Use this image** selects the screenshot already captured for that interaction.
- **New section** records a section boundary after the interaction.
- **Ignore** keeps the evidence but excludes the interaction from generated steps.

Automatic capture remains the default. A consultant does not need to use any of
these commands for an ordinary recording.

Each command is persisted as an immutable raw `capture-guidance` event and points
to the target by Canonical Event ID. It never changes the target event and never
uses an array position. Event Normalization preserves the directive, while Event
to Step Grouping attaches it to the matching group. Guidance events are supporting
evidence and therefore cannot create an extra documentation step.

The background service resolves the latest real event across all frames in the
recording tab. **Use this image** succeeds only when that event already has a
captured screenshot; otherwise the panel reports a recoverable error. Historical
recordings without guidance continue through the unchanged automatic path.

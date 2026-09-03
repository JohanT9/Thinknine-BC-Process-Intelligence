# Process and diagram export

The Process Overview can export the active validated Process Model in two
complementary formats.

## Process JSON

**Export process** creates a deterministic UTF-8 JSON file containing the
versioned Thinknine Process Model. It preserves activities, decisions,
transitions, subprocess ownership, observed state transitions, provenance and
traceability. This is the machine-readable source for integrations and future
comparison workflows.

Because the model can contain recorded captions and traceability identifiers,
the JSON file must be handled with the same care as the process document. The
file is created only after an explicit consultant action and is downloaded
locally.

## Process diagram SVG

**Export diagram** creates a standalone, accessible SVG. It renders:

- adaptive multi-row flow instead of one unbounded horizontal line;
- start, end, business process, document, posted document, posting, system,
  manual, activity and decision node treatments;
- process phase and semantic-role swimlanes;
- sequence, conditional, alternate, return, creation and posting transitions;
- transition labels;
- up to two observed state changes per activity.

The SVG contains presentation content but deliberately excludes raw event and
evidence identifiers. XML content is escaped and the output is deterministic,
so equal Process Models produce equal files. The diagram can be opened in a
browser, placed in a presentation, or converted by another graphics tool.

SVG rendering is owned by `process-svg-export.js`. It consumes the same visual,
route, and lane contracts as Process Overview but calculates export geometry
without reading the open browser DOM. Export therefore remains deterministic
and does not depend on the user's current screen size or zoom level.
The selected Automatic or Vertical map direction is respected by diagram
export; viewport zoom is intentionally not exported.
The selected Business Central, Neutral, or Monochrome theme is also applied to
the SVG without changing the Process Model.

Both exporters validate the Process Model before producing a file. Invalid
models fail safely and show an error without downloading partial output.

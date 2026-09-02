# Reference Process Library

## Purpose

The Reference Process Library contains canonical semantic examples of common
Microsoft Dynamics 365 Business Central processes. The same definitions can
support deterministic recognition, ProcessGraph generation, AI context,
training datasets, recording comparison, and documentation generation.

References describe known standard patterns, not mandatory customer behavior.
Comparison results are advisory and never classify deviations as errors.

## Reference contract

Every reference contains:

- stable `id`, readable `name`, `domain`, and `description`;
- `startingDocument` and `endingDocument`;
- expected and optional documents;
- expected and optional business actions;
- expected typed transitions;
- variants and configuration requirements;
- metadata and future extension fields.

References contain no screenshots, raw UI events, DOM, CSS, coordinates,
geometry, renderer settings, or diagram-library data.

The Business Central seed contains 35 references across Order to Cash, Source to
Pay, Inventory, Production, Planning, Assembly, and Item Tracking. It includes
simple, basic warehouse, advanced warehouse, returns, drop shipment, production,
planning, assembly, lot, serial, and expiration patterns requested for the first
library version.

## Matching recordings

`matchRecordingToReference(recording, library, options)` derives observed
documents and actions from Canonical Recording, verified recognition evidence,
and Semantic Classification. It compares ordered documents, actions, and
document transitions without modifying the recording.

The result contains:

- `bestMatch` and overall `confidence`;
- `matchedSteps`;
- `missingSteps`;
- `unexpectedSteps`;
- ranked `alternativeMatches`;
- the normalized observed evidence;
- explicit `advisory` and `customizedProcessMayBeValid` flags.

Optional reference steps do not count as missing. Unexpected steps reduce
confidence only slightly because a customer extension or local process can be
valid. Each individual match sets `deviationIsError: false`.

## Extension contract

`create` validates and freezes a library. `get`, `list`, and `context` expose
stable semantic definitions. `extend` returns a new registry and never mutates
the base library.

An Aptean Food & Beverage package can register its own library ID, namespace,
domains, reference IDs, process semantics, variants, and requirements without
changing the Business Central seed or matching engine. Duplicate identities and
incomplete references are rejected.

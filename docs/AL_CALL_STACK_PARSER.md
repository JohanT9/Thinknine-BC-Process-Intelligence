# AL Call Stack Parser

The renderer-neutral parser transforms captured `rawCallStack` text into
derived technical frames. Raw Business Central evidence remains authoritative
and unchanged. Parser schema version is `1`; parser version is `1.0.0`, both
independent from product, Canonical Recording and Bug Report versions.

## Supported syntax

Version 1 explicitly recognizes these sanitized BC-shaped forms:

- `"Object Name"(Codeunit 80).Method(Context) line 12`
- `Page 42 "Object Name".OnOpenPage(Trigger) line 3`
- optional `at <source> line <number>` metadata;
- optional `- <App> by <Publisher> version <Version> (<App ID>)` metadata;
- explicit `EventPublisher:` and `EventSubscriber:` context;
- indented continuation lines belonging to the preceding frame.

Known type labels include Codeunit, Page, Table, TableExtension, PageExtension,
Report, Query, XMLport, Enum and Interface. Future types remain parsed with an
`unknown-object-type` warning.

The parser preserves source order and each frame's `rawText`. Unsupported text
remains in `unparsedSegments`. Status is `parsed`, `partially-parsed`,
`unparsed`, or `not-available`. Detectable truncation produces a warning.

Object IDs, names, app ownership, procedures, events, source paths and lines are
never inferred. No frame is called a root cause.

Stack text is untrusted plain text. The parser does not evaluate it, emit HTML,
use browser APIs, access source, call a network service, query Application
Insights or use AI. Old evidence can be re-parsed by later parser versions.

No sanitized real customer AL stack exists locally. The corpus is explicitly
labeled synthetic robustness data shaped like sanitized BC output; production
format coverage still requires pilot validation.

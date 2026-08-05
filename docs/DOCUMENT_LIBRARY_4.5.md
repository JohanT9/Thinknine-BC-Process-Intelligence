# Document Library 4.5

## Purpose

Document Library makes completed documentation recognizable and retrievable by
meaning rather than filename. It is a local knowledge workspace, not a file
explorer, document management system or renderer.

## Architecture and data ownership

`document-library.js` is a browser/CommonJS domain module. It normalizes
versioned records, preserves unknown future fields, builds searchable text once,
combines filters, provides deterministic sorting and grouping, and owns logical
selection movement. All returned domain values are recursively immutable.

`document-library-view.js` renders accessible cards, empty state, profile groups
and metadata preview. `dashboard.js` composes the modules with existing session
navigation. `background.js` persists the collection under the shared storage
key defined by `storage-keys.js`.

Each record references an existing documentation project through stable
`projectId` and `sessionId`. It may contain title, profile and theme summaries,
dates, author, qualitative Document Health, tags, favourite/recent state,
reading-time estimate, thumbnail reference, workflow and section names. The
library stores metadata only. It never stores Review state, Semantic Document,
planner state, Word structures, renderer state or screenshot bytes.

## Search, filtering and sorting

Search updates on every input and uses a precomputed, accent-insensitive corpus
covering title, profile, theme, tags, scalar metadata, workflow and section
names. Profile, theme, health, favourite, recently used, creation date and
modification date filters compose with AND semantics. Results sort by modified,
created, title, recently opened, profile or health and may be grouped by profile.

The baseline record comes from lightweight session metadata already requested
by the dashboard. Richer section, profile, theme and health summaries are
materialized only after Document Workspace has already run its normal pipeline.
Opening or searching the library never loads Review, builds Semantic Document,
runs Planner, prepares screenshots or renders Word.

## Preview and activity

Selection renders only indexed metadata: title, profile, health, summary,
workflow, recent activity and positive confirmations. Opening a card marks its
metadata as recently used, then loads the existing Review flow on demand.
Favourites are independent metadata flags and do not alter source documents.

## Document Health and Celebrate Progress

Library health is a qualitative snapshot of the existing advisory
Documentation Intelligence result. No numeric score is introduced and no
second diagnostics pass occurs. Existing positive profile confirmations such
as complete workflow, screenshots and accessibility are retained so browsing
reinforces completed work as well as remaining suggestions. Documentation
Intelligence remains advisory.

## Accessibility

The controls use native search, label, select, date and checkbox semantics.
Results are a named listbox with option cards, one roving tab stop and
Arrow/Home/End navigation. Selection and favourite state use `aria-selected`
and `aria-pressed`; result counts and preview changes are announced politely.
Focus indicators remain visible in forced colors and no interaction depends on
motion. Card actions remain native buttons.

## Performance and compatibility

The initial path loads the session list plus one metadata collection. Search
does not inspect project data and preview performs no storage read. A behavior
test indexes and searches 10,000 records within a conservative local budget.
Existing sessions without library metadata receive safe defaults and require no
migration. Records for deleted sessions are omitted because the library only
references existing projects.

## Known limitations

- Data is local to the extension; there is no cloud sync, sharing or
  collaboration.
- Tags, author and thumbnails can be displayed/indexed but do not yet have a
  dedicated metadata-editing workflow.
- Health and section metadata remain minimal until Document Workspace has been
  opened for that project.
- Quick Preview is metadata-only and deliberately does not preview screenshots
  or the full document.
- There is no version control or AI search.

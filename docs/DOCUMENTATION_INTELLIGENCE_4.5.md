# Documentation Intelligence 4.5

## Purpose

Documentation Intelligence is a calm, advisory assistant. It helps consultants
understand what is already ready and what may deserve attention without leaving
Documentation Excellence. It never criticises, blocks or modifies a document.

## Architecture

The pure `documentation-intelligence.js` projection consumes Semantic Document,
Document Plan, existing Quality Diagnostics and the current Workspace Context.
It produces a deeply immutable model containing qualitative health, guidance
groups, guidance items and navigation context. It has no Review, DOM, renderer
or Word dependency.

Quality rules remain the single owner of analysis. Intelligence deduplicates by
stable diagnostic ID and translates findings into positive presentation. It
does not rerun rules or add a competing validation system.

## Document Health

Document Health deliberately has no score or percentage. Overall status is
`Ready for Review` or `Needs Attention`. Subject summaries cover screenshots,
accessibility, metadata, workflow, revision history and documentation using
qualitative labels such as `Complete`, `Good` and `Good with Suggestions`.

## Guidance

Items provide a title, constructive description, qualitative severity,
document location, recommended action, status and Workspace Context target.
Filters support severity and subject groups. Stable-ID DOM reconciliation keeps
unchanged items and keyboard focus intact during live updates.

Selecting an item navigates through Workspace Context. The corresponding
document area is revealed and highlighted, while the matching Review selection
is prepared. Guidance never applies corrections.

## Boundaries

- no AI
- no automatic correction
- no document editing
- no export blocking
- no Review persistence
- no Word rendering changes

## Profile-aware guidance and Celebrate Progress

UX5 optionally supplies an immutable Document Profile to the intelligence
projection. Profile expectations add advisory recommendations only when they
are relevant and reorder groups according to profile priorities. They never
become validation failures.

Document Health includes the active profile and positive confirmations alongside
recommendations. Completed workflow, screenshot support, accessibility,
metadata, purpose and revision history are acknowledged when appropriate.
Confirmations are qualitative and no score or percentage is introduced.

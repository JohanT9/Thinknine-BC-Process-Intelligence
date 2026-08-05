# Presentation Planning 4.4

## Purpose

RC8 makes exported documentation feel intentionally authored while preserving
the exact semantic content. Presentation is a deterministic transformation of a
Semantic Document and a resolved Theme into a renderer-neutral Document Plan.

## Responsibilities

Document Planner owns:

- cover hierarchy and balance;
- metadata grouping, ordering and compactness;
- heading hierarchy and section-transition intent;
- step, callout and screenshot grouping;
- primary and supporting screenshot emphasis;
- whitespace and `keepTogether`/`keepWithNext` intent;
- table header emphasis and row integrity.

Planner does not inspect Review, create Word objects, calculate exact pages or
rewrite content. Word Adapter does not choose presentation; it maps planned
intent and resolved appearance to DOCX primitives.

## Theme utilization

The Base theme supplies complete backward-safe defaults. Thinknine overrides
document typography, margins, cover, metadata, headings, steps, screenshots,
callout roles, tables and revision history. Existing themes inherit new defaults
without migration. Visual values are tokens; Planner and adapters do not own a
second palette or spacing system.

## Smart presentation strategy

- The first screenshot is primary and uses the available content width.
- Additional screenshots remain in the same sequence with a consistent
  supporting width.
- Image aspect ratio and source quality are preserved.
- Instructions stay with following evidence where practical.
- Headings avoid orphaning; table and revision rows request row integrity.
- Callout meaning is unchanged, but semantic roles resolve to distinct theme
  appearance.
- Metadata is logically grouped into identity, context and review information.

These are planning hints, not a pagination algorithm. Word retains authority
over final line and page breaking.

## Compatibility

Review, Review Projector and Semantic Document are unchanged. Existing Reviews
and themes require no migration. The adapter retains safe rendering defaults for
older valid Document Plans. No AI, PDF or HTML export was introduced.

## Verification

Behaviour tests verify planning intent, theme consumption, determinism,
immutability, repeated exports, legacy-plan compatibility and DOCX structure.
The [RC7/RC8 visual comparison](RC8_VISUAL_COMPARISON.md) uses the same Review
fixture for both versions and demonstrates presentation changes without content
changes.

# Smart Document Profiles 4.5

## Purpose

Document Profiles define expectations for a document type. They help consultants
remember what is useful in a Business Process, SOP, Training Guide, Quick
Reference or Troubleshooting Guide without modifying document content.

## Model

The versioned immutable model may contain profile identity, description, theme,
recommended sections and metadata, workflow and revision expectations,
expected screenshots, guidance priorities, positive confirmations,
capabilities and future metadata. Normalization preserves unknown future fields.

Profiles are renderer-neutral. They never contain DOCX, DOM, Word, Review or
editing instructions.

## Built-in profiles

- **Business Process** — balanced process analysis and handover.
- **Standard Operating Procedure (SOP)** — controlled instructions with strong
  revision and approval expectations.
- **Training Guide** — explanatory text, accessibility and visual support.
- **Quick Reference** — concise lookup-oriented instructions.
- **Troubleshooting Guide** — diagnostic flow, evidence and recovery context.

## Runtime integration

For each current document revision, Documentation Excellence resolves and caches
the theme and Document Plan variant for every built-in profile. Changing the
selector chooses a cached variant, recalculates advisory intelligence and
updates Document Health. It does not regenerate Review or Semantic Document at
switch time and never alters Word export.

Workspace Context and reading position are preserved. Profile choice is UI
state and is deliberately absent from Review persistence and history.

## Celebrate Progress

Profiles contain positive confirmation labels. Documentation Intelligence uses
them to acknowledge completed workflow, screenshots, accessibility, metadata,
purpose and revision history as often as it suggests improvement.

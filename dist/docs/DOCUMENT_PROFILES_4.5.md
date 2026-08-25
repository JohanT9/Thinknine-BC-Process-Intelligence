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

For each current document revision, BC Process Studio resolves and caches the
theme and Document Plan variant for the profile assigned through Document
Library metadata. It does not regenerate Review or Semantic Document and the
permanent profile/guidance sidebar has been removed from Document Generator.

Profile assignment is deliberately absent from Review persistence and history.

## Celebrate Progress

Profiles contain positive confirmation labels. Documentation Intelligence uses
them to acknowledge completed workflow, screenshots, accessibility, metadata,
purpose and revision history as often as it suggests improvement.

## Document Library integration (UX6)

The library stores the last materialized profile identity and display name as
metadata, enabling filtering and grouping across Business Processes, SOPs,
Training Guides, Quick References and Troubleshooting Guides. This snapshot is
for discovery only: it does not persist profile choice into Review and does not
change the profile model, planning or Word export. Celebrate Progress labels
already produced for that profile may be shown on cards and in Quick Preview.

## Batch profile assignment (UX7)

Batch assignment updates only the library's profile metadata and marks the old
health snapshot as requiring reassessment. It preserves Review and document
content. Opening the project later selects the assigned built-in profile and
the normal advisory Documentation Intelligence path recalculates expectations
and qualitative Document Health. No background projection or Planner run is
triggered by the batch operation.

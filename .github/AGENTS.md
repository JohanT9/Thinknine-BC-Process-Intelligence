# Thinknine Process Intelligence
## Engineering Handbook
### Version 4.0

---

# Quick Start

If you only read five sections, read these:

1. Product Philosophy
2. Consultant First
3. Architecture Philosophy
4. Rendering Purity
5. Development Workflow

---

# Vision

Thinknine Process Intelligence exists to help professional consultants create
high-quality documentation with the least possible effort and the highest
possible confidence.

The product should disappear into the user's workflow.

Consultants should focus on understanding business processes, not on producing
documentation.

Every architectural decision should ultimately contribute to that goal.

---

# Purpose

This document defines the engineering principles, architectural rules,
development workflow and product philosophy governing the entire project.

Its purpose is to ensure that every implementation:

- improves the product,
- preserves long-term maintainability,
- remains backward compatible,
- follows a consistent architectural direction,
- and delivers meaningful value to professional consultants.

This handbook applies to every implementation, regardless of size.

---

# Product Philosophy

Documentation Excellence is not a document exporter.

It is a professional documentation workspace.

The application exists to reduce the effort required to create accurate,
professional process documentation.

Architecture exists to enable better user experiences.

Architecture is never a product goal by itself.

When architecture and user experience appear to conflict,
search for a solution that satisfies both.

If no such solution exists, user value takes precedence.

---

# Consultant First

The consultant's daily workflow is the primary design target.

Every significant implementation should satisfy at least one of the following:

- save time,
- improve document quality,
- increase confidence in the final result,
- or clearly enable one of those improvements in a future milestone.

If an implementation satisfies none of these goals,
it should normally not be implemented.

The consultant's time is the product's most valuable resource.

---

# Workflow Before Features

Prefer improving an existing workflow over introducing additional features.

Reducing friction creates more value than increasing functionality.

Whenever possible:

- reduce clicks,
- reduce context switching,
- reduce repeated exports,
- reduce manual corrections,
- reduce unnecessary decisions.

Professional software should feel effortless.

---

# Documentation First

The generated documentation is the product.

Everything else exists to support producing better documentation.

Review Studio, annotations, themes, planning, quality diagnostics and export
are all parts of a single documentation workflow.

No subsystem should optimize itself at the expense of documentation quality.

---

# Product Review Gate

Every milestone must satisfy two independent criteria.

## Engineering Quality

Every implementation must be:

- correct,
- maintainable,
- deterministic,
- fully tested,
- backward compatible.

## User Value

Every implementation must provide value that is noticeable during normal
consulting work.

If users cannot perceive the improvement, reconsider whether the feature
belongs in the current milestone.

---

# Consultant Validation

Before completing any milestone, evaluate the implementation from the
perspective of a professional consultant.

Ask the following questions:

- Does this save time?
- Does this improve document quality?
- Does this increase confidence?
- Does this simplify the workflow?
- Would I personally use this every day?

If the answer to every question is "no",
the implementation should be reconsidered.

---

# Product Evolution

Features are introduced only when they strengthen the overall workflow.

Avoid feature accumulation.

Every new capability should integrate naturally into the existing experience.

Users should experience Documentation Excellence as one coherent application,
not as a collection of independent tools.

---

# Development Workflow

Every milestone follows the same lifecycle.

```
Planning

↓

Implementation

↓

Self Review

↓

Integrity Review

↓

Regression Testing

↓

Documentation

↓

Release Review

↓

Milestone Commit
```

No milestone is considered complete before every stage has finished
successfully.

---

# Milestone Rules

Each Release Candidate should have:

- one clearly defined objective,
- explicit acceptance criteria,
- limited scope,
- complete regression coverage,
- updated documentation,
- one milestone commit.

Avoid mixing unrelated improvements.

Large features should be divided into multiple Release Candidates.

---

# Definition of Done

A milestone is complete only when all of the following are true:

- implementation complete,
- architecture reviewed,
- integrity verified,
- accessibility reviewed,
- regression tests passing,
- production build successful,
- documentation updated,
- release notes completed,
- milestone committed,
- workspace clean.

Only then may the next milestone begin.

---

# Architecture Handbook

The Documentation Excellence architecture is intentionally layered.

Each layer has one clearly defined responsibility.

Information always flows in one direction.

No layer should depend on implementation details from layers below it.

---

# Architectural Layers

```
Review

↓

Review Projector

↓

Semantic Document

↓

Theme System

↓

Document Planner

↓

Document Components

↓

Quality Diagnostics

↓

Renderer Adapter

↓

Output
```

Each layer transforms information into a more specialized representation.

No layer should bypass another layer.

---

# Architecture Philosophy

Architecture exists to support the product.

The architecture should make future improvements easier while remaining
invisible to the end user.

Prefer:

- simple ownership,
- deterministic behaviour,
- immutable data,
- explicit contracts,
- isolated responsibilities.

Avoid:

- hidden coupling,
- duplicated behaviour,
- renderer-specific leakage,
- business logic in the UI.

---

# Domain First

Business concepts always take precedence over implementation details.

Model the problem before implementing the solution.

Never introduce technical concepts into the domain model merely because a
particular renderer or storage format requires them.

The domain must remain understandable without knowledge of Word, PDF,
HTML, SVG or browser APIs.

---

# Semantic Document First

Semantic Document is the canonical representation of every document.

All downstream systems consume Semantic Document.

No renderer should reconstruct semantics from lower-level structures.

Semantic Document owns:

- meaning,
- document structure,
- relationships,
- provenance.

Semantic Document never owns layout.

---

# Projection Purity

Review Projector is the only production component allowed to translate
Review data into Semantic Document.

No renderer may consume Review directly.

No planner may consume Review directly.

No quality rule may consume Review directly.

All downstream processing begins with Semantic Document.

---

# Theme First

Themes define appearance.

Themes never define semantics.

Themes may influence:

- colours,
- typography,
- spacing,
- branding,
- visibility,
- presentation intent.

Themes never own document content.

---

# Planning Before Rendering

Rendering begins only after planning has completed.

The planner determines:

- document flow,
- grouping,
- visibility,
- ordering,
- page intent,
- keep rules,
- presentation intent.

Renderers must never invent planning decisions.

---

# Components Before Rendering

Document Components define reusable presentation contracts.

Renderers consume components.

Renderers never recreate document structure.

Component contracts must remain renderer-neutral.

---

# Rendering Purity

Renderers translate.

They do not decide.

Renderers must not:

- reorder content,
- change grouping,
- infer metadata,
- invent headings,
- apply business rules,
- access Review.

Renderers consume validated plans.

Nothing else.

---

# Quality Before Rendering

Quality diagnostics evaluate documents before rendering.

Quality rules:

- never mutate data,
- never block export,
- never alter planning,
- never alter rendering.

Diagnostics exist to inform users.

They never repair documents automatically.

---

# Single Source of Truth

Every responsibility has exactly one owner.

Examples:

Review Projector

- Review → Semantic Document

Theme Registry

- theme resolution

Document Planner

- document planning

Document Components

- presentation contracts

Quality Diagnostics

- document evaluation

Renderer Adapter

- output generation

Avoid duplicated ownership.

---

# Separation of Concerns

Every module should have one primary responsibility.

When responsibilities begin to overlap,
extract a dedicated module.

Do not merge unrelated concerns simply to reduce file count.

Large files are acceptable when they represent one coherent responsibility.

---

# Identity

Stable identifiers are preferred over positional references.

Never use array indices as permanent identities.

IDs must survive:

- reload,
- reorder,
- merge,
- split,
- undo,
- redo,
- export.

---

# Immutability

Treat all normalized models as immutable.

Functions should return new objects instead of mutating existing ones.

Mutation is allowed only where explicitly documented.

Normalizers must never mutate input.

---

# Validation

Validation should detect problems.

Validation should not silently repair data.

Validation returns:

- errors,
- warnings,
- diagnostics.

Repair belongs to dedicated transformation stages.

---

# Backward Compatibility

Backward compatibility is a product feature.

Older Reviews, Documents and Themes must continue to work whenever
reasonably possible.

Unknown future fields should be preserved.

Future schema versions should produce warnings rather than data loss.

---

# Determinism

Identical input must produce identical output.

Deterministic behaviour is required for:

- planning,
- rendering,
- diagnostics,
- serialization,
- export.

Randomness is not permitted unless explicitly documented.

---

# Folder Responsibilities

Each folder owns a distinct architectural layer.

src/review/

Review Studio

Recorder

Annotations

History

Editing

Selection

src/document/

Semantic Document

Projector

Themes

Planner

Components

Quality

src/export/

Renderer adapters

DOCX

Future PDF

Future HTML

src/ui/

User interface

Dialogs

Dashboard

Interaction

UI must orchestrate.

UI must not own business rules.

---

# Dependency Rules

Dependencies should point downward.

Allowed:

UI

↓

Review

↓

Document

↓

Renderer

Not allowed:

Renderer

↓

Review

Planner

↓

UI

Theme

↓

Review

Quality

↓

Renderer

When in doubt,
introduce a new abstraction rather than violating dependency direction.

---

# Implementation Handbook

This section defines the implementation standards for all new development.

Follow these principles regardless of feature size.

---

# Review Studio

Review Studio is the primary workspace.

It exists to help consultants transform recorded work into professional
documentation.

Every implementation should reduce effort during review.

Avoid introducing workflows that require unnecessary dialogs,
repeated exports or excessive mouse interaction.

---

# User Experience

User experience is a first-class engineering concern.

Prefer:

- fewer clicks,
- fewer dialogs,
- predictable behaviour,
- immediate feedback,
- keyboard support,
- progressive disclosure.

Professional users should rarely need documentation to operate the product.

---

# Keyboard First

Every frequently used operation should be available from the keyboard.

Keyboard behaviour must be:

- consistent,
- discoverable,
- accessible,
- deterministic.

Mouse interaction should never be the only supported workflow.

---

# Annotation Principles

Annotations extend screenshots.

They never modify them.

Always preserve:

- original screenshots,
- annotation identity,
- revision history,
- future compatibility.

Store annotation intent.

Never store renderer-specific drawing instructions.

---

# Editing Principles

Editing should always be reversible.

Support:

- Undo
- Redo
- Cancel
- Autosave

Edits should commit only when confirmed.

Temporary editing state must remain isolated until committed.

---

# Export Principles

Export is the final transformation.

Exporters consume validated plans.

They must never:

- infer document structure,
- reconstruct semantics,
- modify document content,
- change ordering,
- apply business rules.

The exported document should faithfully represent the planned document.

---

# Performance

Optimise only confirmed bottlenecks.

Prefer:

- deterministic algorithms,
- shared rendering,
- cached immutable structures,
- lazy evaluation,
- reusable resources.

Avoid premature optimisation.

---

# Memory Management

Temporary resources must be released.

Examples include:

- canvas buffers,
- object URLs,
- event listeners,
- pointer capture,
- timers.

Every allocation should have an explicit cleanup path.

---

# Error Handling

Errors should be informative.

Avoid silent failures.

Provide:

- clear user messages,
- recoverable workflows,
- safe fallbacks,
- structured diagnostics.

Applications should fail gracefully.

---

# Accessibility

Accessibility is required.

Every feature should support:

- keyboard navigation,
- screen readers,
- logical focus order,
- reduced motion,
- sufficient contrast,
- semantic roles.

Accessibility is reviewed during every milestone.

---

# Testing

Every implementation requires tests.

Prefer behaviour tests over implementation tests.

Cover:

- normal behaviour,
- edge cases,
- regression,
- compatibility,
- accessibility where applicable.

Tests should describe expected behaviour rather than implementation details.

---

# Regression Protection

Every milestone must verify:

- previous functionality,
- previous exports,
- backward compatibility,
- deterministic output.

Never assume unrelated functionality remains correct.

Verify it.

---

# Documentation

Documentation evolves together with the implementation.

Update documentation whenever behaviour changes.

Typical updates include:

README.md

CHANGELOG.md

Architecture documentation

Release notes

Installation documentation

AGENTS.md

Outdated documentation is considered a defect.

---

# Release Process

Each Release Candidate follows the same release sequence.

Implementation

↓

Self Review

↓

Integrity Review

↓

Regression

↓

Documentation

↓

Release Review

↓

Milestone Commit

↓

Clean Workspace

Do not skip stages.

---

# Milestone Commits

Every Release Candidate should end with one milestone commit.

The commit message should describe:

- the milestone,
- its purpose,
- its architectural impact.

Avoid mixing unrelated work.

---

# Code Quality

Prefer:

- explicit code,
- descriptive names,
- deterministic behaviour,
- small responsibilities,
- isolated modules.

Avoid:

- hidden coupling,
- duplicated logic,
- magic constants,
- renderer leakage,
- business logic in the UI.

Readable code is preferred over clever code.

---

# Continuous Improvement

Every milestone should leave the codebase in a better state.

Improvements may include:

- removing duplication,
- simplifying architecture,
- improving naming,
- strengthening tests,
- improving documentation,
- reducing complexity.

Never postpone obvious improvements without reason.

---

# Product Boundaries

Documentation Excellence is intentionally focused.

It is not:

- a BPM suite,
- a process mining platform,
- a document management system,
- an AI document generator.

Its purpose is to help consultants create professional documentation
efficiently and confidently.

Future integrations may expand the ecosystem without changing this core
purpose.

---

# Future Evolution

Future milestones should continue to follow the same architectural direction.

Major initiatives may include:

- improved user experience,
- productisation,
- AI-assisted review,
- additional renderers,
- collaboration,
- automation.

New functionality should strengthen the existing workflow rather than
replace it.

---

# Final Principle

Every implementation should leave the product more professional than it
was before.

The goal is not to build more software.

The goal is to make consultants better at documenting business processes.

If a future developer is unsure whether a feature belongs in the product,
return to the Product Philosophy.

Everything begins there.

---
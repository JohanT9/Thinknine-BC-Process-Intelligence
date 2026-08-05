# Thinknine Process Intelligence
# Engineering Standards

Version: 3.0

---

# Purpose

This document defines the engineering standards for the Thinknine Process Intelligence project.

These standards apply to:

- AI agents
- Human developers
- Future contributors

The objective is to ensure that every implementation improves the product without increasing unnecessary complexity or technical debt.

The project should evolve through small, well-tested, maintainable milestones.

Whenever multiple implementation alternatives exist, prefer the solution that will still be easy to understand and maintain five years from now.

---

# Development Workflow

Every non-trivial implementation follows the same workflow.

## 1. Understand

Study the existing implementation before writing code.

Understand:

- architecture
- responsibilities
- existing abstractions
- public APIs
- persistence
- tests

Never assume functionality.

---

## 2. Design

Before implementation, identify:

- affected modules
- affected data
- architectural impact
- compatibility risks
- performance risks

If a simpler solution exists, prefer it.

---

## 3. Implement

Implement the smallest possible change.

Avoid:

- unnecessary refactoring
- unrelated improvements
- unnecessary renaming
- large diffs

Each implementation should solve one clearly defined problem.

---

## 4. Verify

Run whenever applicable:

- lint
- behaviour tests
- visual regression tests
- data integrity tests
- build
- syntax verification

Fix confirmed issues before continuing.

---

## 5. Review

Perform a critical self-review.

Review:

- architecture
- duplication
- maintainability
- accessibility
- performance
- compatibility
- data integrity

Do not consider work complete until this review has been performed.

---

# Product Vision

Thinknine Process Intelligence is an AI-assisted platform for documenting, reviewing and continuously improving Microsoft Dynamics 365 Business Central processes.

The platform is intended for:

- Business Central consultants
- Solution architects
- Implementation partners
- Key users
- Customers

The product supports the complete documentation lifecycle:

Record

↓

Review

↓

Improve

↓

Document

↓

Reuse

↓

Build Knowledge

↓

Continuously Improve

The product is not a click recorder.

It transforms recorded user activity into professional process documentation.

Documentation excellence is the foundation upon which future process intelligence capabilities will be built.

---

## Documentation First

The primary purpose of Thinknine Process Intelligence is to generate high-quality process documentation with minimal manual editing.

New features should first improve one or more of the following:

- documentation quality
- documentation consistency
- documentation readability
- documentation efficiency
- documentation maintainability

Expanding the scope of the product must not come at the expense of documentation quality.

When prioritizing future work, prefer making documentation exceptional over adding project-management functionality.

Documentation excellence is the product's primary competitive advantage.

---

# Product Modules

The system consists of independent modules.

Each module has one clearly defined responsibility.

---

## Recorder

Responsible for:

- capturing browser activity
- recording screenshots
- recording events

Recorder never performs documentation.

Recorder never performs business analysis.

---

## Review Studio

Review Studio is the primary workspace.

Most user interaction should happen here.

Responsibilities:

- review
- edit
- merge
- split
- reorder
- annotate
- validate
- prepare documentation

Whenever UX decisions are required, optimize Review Studio first.

---

## Document Generator

Responsible for generating:

- Word
- PDF (future)
- HTML (future)

Document generation should never duplicate business logic.

Formatting, metadata and rendering should be shared whenever possible.

---

## Knowledge Base

Responsible for storing reusable business knowledge.

Future responsibilities include:

- similar process detection
- reusable documentation
- knowledge packs
- process comparison

Knowledge must remain independent from Recorder.

---

## AI Assistant

Responsible for:

- suggestions
- validation
- summarisation
- quality improvements

AI assists the user.

AI must never unexpectedly modify documentation.

---

# Engineering Principles

Engineering principles override implementation preferences.

Whenever a conflict exists between convenience and these principles,
the engineering principles take precedence.

---

## Domain First

The domain model defines the product.

The UI visualizes the domain.

Exports represent the domain.

Rendering represents the domain.

Never design the domain around the UI.

Always design the UI around the domain.

---

## Token First

Visual appearance should be defined through tokens rather than hard-coded values.

Colors, typography, spacing and branding should be data.

Rendering engines consume tokens.

They do not define them.

---

## Single Source of Truth

Business logic must exist only once.

Examples:

Filename generation

↓

Preview

↓

Word

↓

Workspace

↓

ZIP

All use the same implementation.

Never duplicate business algorithms.

---

## Data Integrity

Data integrity has higher priority than feature completeness.

Never risk corruption of:

- Reviews
- Tasks
- Screenshots
- Annotations
- History

When functionality conflicts with correctness,

correctness always wins.

---

## Stable Identity

Every persistent object should have a stable identifier.

Prefer:

UUIDs

Stable IDs

Persistent references

Never rely on:

array indexes

visual order

temporary positions

Identity must survive:

- reorder
- merge
- split
- undo
- redo
- persistence

---

## Immutable Inputs

Functions responsible for:

- normalization
- validation
- rendering

must never mutate input objects.

Return new objects whenever transformations are required.

Mutation should happen only through explicit domain commands.

---

## Single Rendering Pipeline

Rendering logic must exist only once.

Preview

↓

Annotation Editor

↓

Word Export

↓

Future PDF Export

should reuse the same rendering pipeline whenever practical.

Different rendering targets are acceptable.

Different rendering implementations are not.

Geometry calculations must never be duplicated.

---

## Rendering Purity

Rendering is a pure transformation.

Rendering modules receive immutable domain objects and produce rendered output.

Rendering must never modify:

- Review
- Task
- Screenshot
- Annotation

Rendered output is disposable.

The domain model is the single source of truth.

Temporary rendering data must never be persisted.

---

## Projection Purity

Projection is a pure transformation.

Projectors receive immutable Review data and produce immutable Semantic Documents.

Projectors must never:

- mutate Review
- perform rendering
- perform layout
- generate Word objects
- generate PDF objects

Projectors describe WHAT exists.

Never HOW it will be rendered.

---

## Backward Compatibility

Backward compatibility is the default.

Existing Review data should continue working whenever possible.

Avoid mandatory migrations.

Unknown future schema fields must be preserved.

Unknown object types must never be discarded.

Normalize without mutating original input.

---

## Separation of Concerns

Keep responsibilities separated.

UI

↓

Application Logic

↓

Business Logic

↓

Persistence

↓

Rendering

↓

Export

Never mix these responsibilities.

---

## Reuse Before Creating

Before introducing:

- utilities
- helpers
- services
- rendering logic
- persistence logic

search the project.

Prefer extending existing implementations over introducing new ones.

---

## Generated Files

Never edit:

dist/

Generated files are outputs.

Modify only source files.

Generated files should only change through the build process.

# Folder Responsibilities

Every folder has one primary responsibility.

Do not mix responsibilities across folders.

---

## src/

Contains application source code.

Only manually maintained production code belongs here.

---

## tests/

Contains:

- behaviour tests
- regression tests
- visual regression tests
- data integrity tests

Tests should verify observable behaviour.

Avoid testing implementation details whenever practical.

---

## docs/

Contains:

- architecture
- design decisions
- implementation guides
- release documentation

Documentation should explain why decisions were made.

---

## .github/

Contains:

- workflows
- automation
- AI guidance
- templates

Automation should never contain business logic.

---

## dist/

Contains generated output only.

Never edit files inside:

dist/

All changes must originate from source files.

---

# Review Studio Principles

Review Studio is the core of the product.

Users should spend most of their time here.

Whenever a design decision exists between Recorder and Review Studio,

prefer improving Review Studio.

---

## Editing

Editing should always be:

- predictable
- reversible
- non-destructive

Users should feel safe making changes.

---

## Selection

Selection should always use stable object identifiers.

Never use visual indexes.

Selection should survive:

- sorting
- moving
- merging
- splitting
- Undo
- Redo

---

## History

Undo and Redo should represent logical user actions.

Examples

GOOD

Drag an item

↓

One Undo

BAD

Drag an item

↓

200 Undo entries

History should represent intent.

Not implementation details.

---

## Review Sessions

Opening a Review establishes a safe editing context.

Users must always be able to:

- continue
- save
- cancel

without corrupting Review data.

---

# Annotation Principles

Annotations extend screenshots.

They never replace screenshots.

---

## Original Images

Original screenshots are immutable.

Never modify:

- pixels
- metadata
- stored bytes

All annotations are stored separately.

---

## Annotation Storage

Annotations belong to Reviews.

Never embed annotations inside screenshots.

Support future annotation types.

Unknown annotation types must survive load-save cycles unchanged.

---

## Annotation Identity

Each annotation has a stable identifier.

Annotation IDs survive:

- editing
- moving
- saving
- loading
- Undo
- Redo

---

## Annotation Geometry

Annotation geometry is stored in normalized coordinates.

Never persist pixel coordinates.

Rendering decides pixel placement.

Storage never does.

---

## Annotation Editing

The editor modifies only annotation data.

The editor must never:

- modify screenshots
- modify rendering output
- modify export data

---

# Export Principles

Export represents the current Review.

Export never owns business logic.

---

## Export Behaviour

Export should define only:

- destination
- output format

Everything else should reuse existing implementations.

---

## Export Integrity

Export must faithfully represent:

- Review
- Tasks
- Comments
- Images
- Annotations
- Metadata

Never export stale data.

Always export the latest committed Review state.

---

## Export Isolation

Export must never modify:

- Review
- Tasks
- Screenshots
- Annotations
- History

Export is read-only.

---

## Rendering

Rendering exists only to produce output.

Rendering must never become persistence.

---

# Word Generator

Word generation uses:

docx

Never generate OpenXML manually.

---

## Image Handling

Preserve:

- aspect ratio
- resolution
- image quality

Avoid unnecessary recompression.

---

## Screenshot Composition

Annotated screenshots are composed during export.

Original screenshots remain unchanged.

Temporary export images must never be persisted.

---

## Future Compatibility

Future export formats should reuse the same rendering pipeline whenever practical.

Examples:

- Word
- PDF
- HTML

Only the final output adapter should differ.

---

# Business Central Principles

Thinknine Process Intelligence is built for Microsoft Dynamics 365 Business Central.

Design accordingly.

---

## Stable References

Never assume captions are unique.

Prefer:

- IDs
- GUIDs
- internal identifiers

---

## Localisation

Do not depend on translated captions.

Support:

- multiple languages
- custom translations
- partner extensions

---

## Extensions

Assume customer environments contain extensions.

Avoid assumptions about:

- page layouts
- captions
- actions
- object ordering

---

## Compatibility

Design for:

- Business Central
- Aptean Food & Beverage

Future ERP extensions should integrate naturally.

---

# Coding Standards

Write code that is easy to understand.

Future maintainability is more important than cleverness.

---

## Prefer

- small functions
- composition
- descriptive names
- explicit behaviour
- immutable data where practical

---

## Avoid

- large classes
- deep nesting
- duplicated logic
- magic numbers
- magic strings
- hidden side effects

---

## Naming

Names should describe intent.

Good examples:

generateFilename()

renderAnnotationScene()

normalizeReview()

Bad examples:

process()

run()

helper()

util()

---

## Comments

Explain:

WHY

Avoid explaining:

WHAT

Good code should explain itself.

---

## Error Handling

Fail predictably.

Never silently ignore failures.

Provide actionable error messages whenever possible.

Errors should preserve user data.

---

## Performance

Optimize only after correctness.

Prefer:

- incremental updates
- cached calculations
- shared rendering
- reusable components

Avoid:

- repeated rendering
- repeated storage writes
- unnecessary DOM rebuilding
- duplicated calculations

Performance optimizations must never reduce correctness.

# Thinknine Process Intelligence
# Engineering Standards

Version: 3.0

---

# Purpose

This document defines the engineering standards for the Thinknine Process Intelligence project.

These standards apply to:

- AI agents
- Human developers
- Future contributors

The objective is to ensure that every implementation improves the product without increasing unnecessary complexity or technical debt.

The project should evolve through small, well-tested, maintainable milestones.

Whenever multiple implementation alternatives exist, prefer the solution that will still be easy to understand and maintain five years from now.

---

# Development Workflow

Every non-trivial implementation follows the same workflow.

## 1. Understand

Study the existing implementation before writing code.

Understand:

- architecture
- responsibilities
- existing abstractions
- public APIs
- persistence
- tests

Never assume functionality.

---

## 2. Design

Before implementation, identify:

- affected modules
- affected data
- architectural impact
- compatibility risks
- performance risks

If a simpler solution exists, prefer it.

---

## 3. Implement

Implement the smallest possible change.

Avoid:

- unnecessary refactoring
- unrelated improvements
- unnecessary renaming
- large diffs

Each implementation should solve one clearly defined problem.

---

## 4. Verify

Run whenever applicable:

- lint
- behaviour tests
- visual regression tests
- data integrity tests
- build
- syntax verification

Fix confirmed issues before continuing.

---

## 5. Review

Perform a critical self-review.

Review:

- architecture
- duplication
- maintainability
- accessibility
- performance
- compatibility
- data integrity

Do not consider work complete until this review has been performed.

---

# Product Vision

Thinknine Process Intelligence is an AI-assisted platform for documenting, reviewing and continuously improving Microsoft Dynamics 365 Business Central processes.

The platform is intended for:

- Business Central consultants
- Solution architects
- Implementation partners
- Key users
- Customers

The product supports the complete documentation lifecycle:

Record

↓

Review

↓

Improve

↓

Document

↓

Reuse

↓

Build Knowledge

↓

Continuously Improve

The product is not a click recorder.

It is a Business Process Intelligence platform.

---

# Product Modules

The system consists of independent modules.

Each module has one clearly defined responsibility.

---

## Recorder

Responsible for:

- capturing browser activity
- recording screenshots
- recording events

Recorder never performs documentation.

Recorder never performs business analysis.

---

## Review Studio

Review Studio is the primary workspace.

Most user interaction should happen here.

Responsibilities:

- review
- edit
- merge
- split
- reorder
- annotate
- validate
- prepare documentation

Whenever UX decisions are required, optimize Review Studio first.

---

## Document Generator

Responsible for generating:

- Word
- PDF (future)
- HTML (future)

Document generation should never duplicate business logic.

Formatting, metadata and rendering should be shared whenever possible.

---

## Knowledge Base

Responsible for storing reusable business knowledge.

Future responsibilities include:

- similar process detection
- reusable documentation
- knowledge packs
- process comparison

Knowledge must remain independent from Recorder.

---

## AI Assistant

Responsible for:

- suggestions
- validation
- summarisation
- quality improvements

AI assists the user.

AI must never unexpectedly modify documentation.

---

# Engineering Principles

Engineering principles override implementation preferences.

Whenever a conflict exists between convenience and these principles,
the engineering principles take precedence.

---

## Domain First

The domain model defines the product.

The UI visualizes the domain.

Exports represent the domain.

Rendering represents the domain.

Never design the domain around the UI.

Always design the UI around the domain.

---

## Single Source of Truth

Business logic must exist only once.

Examples:

Filename generation

↓

Preview

↓

Word

↓

Workspace

↓

ZIP

All use the same implementation.

Never duplicate business algorithms.

---

## Data Integrity

Data integrity has higher priority than feature completeness.

Never risk corruption of:

- Reviews
- Tasks
- Screenshots
- Annotations
- History

When functionality conflicts with correctness,

correctness always wins.

---

## Stable Identity

Every persistent object should have a stable identifier.

Prefer:

UUIDs

Stable IDs

Persistent references

Never rely on:

array indexes

visual order

temporary positions

Identity must survive:

- reorder
- merge
- split
- undo
- redo
- persistence

---

## Immutable Inputs

Functions responsible for:

- normalization
- validation
- rendering

must never mutate input objects.

Return new objects whenever transformations are required.

Mutation should happen only through explicit domain commands.

---

## Single Rendering Pipeline

Rendering logic must exist only once.

Preview

↓

Annotation Editor

↓

Word Export

↓

Future PDF Export

should reuse the same rendering pipeline whenever practical.

Different rendering targets are acceptable.

Different rendering implementations are not.

Geometry calculations must never be duplicated.

---

## Rendering Purity

Rendering is a pure transformation.

Rendering modules receive immutable domain objects and produce rendered output.

Rendering must never modify:

- Review
- Task
- Screenshot
- Annotation

Rendered output is disposable.

The domain model is the single source of truth.

Temporary rendering data must never be persisted.

---

## Backward Compatibility

Backward compatibility is the default.

Existing Review data should continue working whenever possible.

Avoid mandatory migrations.

Unknown future schema fields must be preserved.

Unknown object types must never be discarded.

Normalize without mutating original input.

---

## Separation of Concerns

Keep responsibilities separated.

UI

↓

Application Logic

↓

Business Logic

↓

Persistence

↓

Rendering

↓

Export

Never mix these responsibilities.

---

## Reuse Before Creating

Before introducing:

- utilities
- helpers
- services
- rendering logic
- persistence logic

search the project.

Prefer extending existing implementations over introducing new ones.

---

## Generated Files

Never edit:

dist/

Generated files are outputs.

Modify only source files.

Generated files should only change through the build process.
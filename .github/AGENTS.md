# BC Process Studio — engineering handbook

This handbook supplements the repository-wide [AGENTS.md](../AGENTS.md). Operational workflow, verification, delivery and mandatory language requirements live there to avoid conflicting copies. These principles apply to the whole project, including process documentation, bug reports and licensing.

## Product purpose

Help users turn observed Business Central work into clear, trustworthy process documents and actionable bug reports with minimal manual effort. Prefer changes that save time, improve document quality, reduce uncertainty or make the workflow easier to understand. Technical work may enable that value without adding a visible feature.

Keep related activities coherent: recording, review, documentation, reporting and export should feel like one application. Use progressive disclosure for advanced tools. Avoid adding a new abstraction, dialog or feature without a concrete need in the current task.

## Evidence and document quality

- Distinguish observed facts, inferred structure, reference suggestions, user edits and AI-assisted analysis. Preserve provenance and stable source references.
- Consolidate low-level interactions only when the recorded evidence supports the same user intent. Keep event order and traceability. If inference is uncertain, preserve the original sequence and expose the uncertainty.
- Filtering technical noise may simplify presentation but must not delete underlying business actions or raw evidence.
- Improve system-generated wording without changing meaning. Never invent missing values, prerequisites, outcomes or success claims. User-authored content is protected.
- Presentation grammar distinguishes actions, interface labels and entered values. Keep interface labels and values recognizable; formatting must not change their meaning.
- Prefer clear screenshots with relevant evidence. Keep original images immutable and store annotations separately with stable identity and revision history.

## Ownership and data flow

The process-document path is owned by the existing review projector, semantic model, transformation stages, planner and renderer adapters. Inspect `src/exporters/word-export-pipeline.js` and the corresponding contracts before changing this flow:

1. Recorded evidence and review edits remain independently traceable.
2. The review projector produces the Semantic Document for process documentation.
3. Explicit transformation stages handle generated language, presentation and other derived refinements.
4. Themes provide appearance; the Document Planner creates a validated renderer-neutral plan.
5. Document views and output adapters consume the applicable plan/contracts without reconstructing review semantics.

Quality diagnostics evaluate the relevant model without mutating it or inventing repairs. Advisory quality concerns should inform the user without being confused with structural validation errors. Invalid plans, missing required assets or failed output generation must produce an actionable failure rather than a corrupt or falsely successful export.

Bug reporting has its own report/evidence models, projection and issue-package contracts under `src/bug-report/`; its PDF, Markdown and email paths already exist. Preserve their ownership and consent boundaries. Do not force bug reports or licensing into the process-document Semantic Document pipeline merely to satisfy a generic diagram.

## Architecture principles

- Each responsibility has a clear owner. Reuse existing services and contracts before adding parallel implementations.
- Domain and transformation modules must not depend on UI state or renderer implementation details. UI orchestrates behavior; adapters translate the supplied representation into output.
- Themes own appearance and presentation intent, not captured content or business meaning. Renderers may make necessary output-format decisions, but must not invent headings, reorder business steps or reinterpret evidence.
- Use immutable normalized data and explicit transformations. Define time, identifiers and external inputs explicitly where needed for repeatable tests. Stable semantics do not require ZIP timestamps or generated IDs to be byte-identical.
- Preserve backwards compatibility through explicit, non-destructive migrations. Unsupported versions must not be silently normalized into data loss.
- Optimize demonstrated bottlenecks. Cache with clear ownership and invalidation; do not allow stale derived data to replace the source of truth.
- Release object URLs, timers, listeners, image/canvas resources and pointer capture according to their lifetime. Test cancellation and cleanup for affected asynchronous operations.

## Editing and recovery

Support undo/redo or another appropriate recovery path for meaningful edits. Autosave and immediate reversible preferences do not need a confirmation dialog for each change. Explicitly destructive replacement must respect the established preview, consent and recovery behavior.

Failures must preserve the user's content and explain the available next step. Avoid silent failure, infinite loading indicators and empty success states after failed reads. Treat filtered views, indexes, generated outputs and raw storage as distinct layers during diagnosis.

## Language and accessibility

Every new feature and change must satisfy the [mandatory all-language requirement](../AGENTS.md#mandatory-language-support-for-every-change). The language registry determines the supported set. Missing translations and fallback text for newly changed system messages are unfinished work.

Keyboard access, accessible names, contrast, focus order, reduced motion and usable layouts are product requirements. Verify changed UI in its actual rendering context and with long translations. Automated checks complement visual and interaction verification; they do not replace it.

## Review and delivery

Review the implementation for user value, ownership, data integrity, compatibility, language coverage, accessibility and failure recovery. Follow the root guide's risk-based test and delivery requirements. Preserve unrelated work and accurately distinguish local completion from publication or deployment.

Update rules when the product or architecture changes. Keep this handbook concise and consistent with the code; do not use historical slogans or milestone ceremony as a reason to skip necessary work or impose unrelated work on a small fix.

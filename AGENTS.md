# BC Process Studio — project instructions

These instructions apply to the entire repository. The architecture and product principles in [.github/AGENTS.md](.github/AGENTS.md) supplement this file. This root file is the authoritative operational guide; nested instructions may add requirements within their scope. User instructions take precedence over repository guidance.

## Start with evidence and preserve the user's work

- Read the relevant code and current instructions before editing. Check Git status and preserve all existing changes, including work from earlier tasks. Do not reset, discard or include unrelated changes just to obtain a clean working tree.
- Establish the observed problem, expected behavior and affected paths. Treat screenshots as evidence, not proof of an underlying cause. Distinguish confirmed findings from hypotheses.
- For missing recordings or documents, inspect active filters, search, archive state, the document index, raw recordings and load errors before concluding that data was deleted. A visible raw recording proves that recording exists; it does not by itself prove why a document is absent from the library.
- Never clear browser storage, reinstall the extension, change its identity, rename persisted keys or rebuild an index destructively as a troubleshooting shortcut. Inspect and back up affected data before any migration or recovery. Destructive actions require authorization for the concrete action.
- Keep changes focused on the requested outcome. Fix the cause rather than hiding a symptom; do not widen the task into an unrelated rewrite.

## Product names and compatibility

- Use **BC Process Studio** as the product name in new user-facing content. Use established component names where applicable. Do not introduce Thinknine or T9 branding into new user-facing text.
- Existing internal names, storage keys, integration endpoints and identifiers may remain for compatibility. Branding work must not silently change persisted identity or break existing installations.
- Preserve recordings, reviews, annotations, document metadata, licenses and language preferences through upgrades. Use stable IDs rather than array positions.
- Treat normalized data as immutable. Preserve unknown fields when the schema permits it. For unsupported future schemas, fail clearly without overwriting or discarding the original data.

## Repository map and sources of truth

- `src/recorder/`: extension background worker, capture and browser integration.
- `src/engine/`: recording/domain services, shared storage keys, language registry and catalogs.
- `src/review/`: review editing, annotations, history and selection.
- `src/document/`: process document projection, semantic model, themes, planning, quality and library models.
- `src/exporters/`: process-document renderer adapters and exports.
- `src/bug-report/`: bug report models, technical evidence, report projection, integrations, PDF and email export.
- `src/ui/`: interface orchestration, views and styles. Keep domain transformations in their owning modules.
- `services/licensing/`: authenticated licensing service, separate admin interface and usage statistics.
- `native/`: native integration helpers; verify their contracts separately when affected.
- `tests/`, `scripts/`, `docs/`: verification, build/release tooling and supporting documentation.
- Edit authored files under `src/`, then regenerate `dist/` with the build script. Do not fix only the generated copy. Confirm the built files contain the final change.
- Use the actual registry, schemas, package scripts and workflows as sources of truth. Update this guide when those contracts change; do not assume a historical handbook diagram describes every subsystem.

## User experience and accessibility

- Prefer direct choices and clear state over cycling through options or requiring repeated clicks. Group related settings and distinguish interface language from document language.
- For every changed UI path, inspect the rendered result at the relevant size, including the narrow extension popup. Check the final CSS cascade, contrast, focus, keyboard access, disabled/loading/error states, long translations and overflow. A syntax check or successful build is not visual verification.
- Prefer native semantic controls and dialogs when suitable. Dialogs need an accessible name, predictable dismissal and focus return. Do not add confirmation steps to ordinary reversible actions unless they solve a concrete problem.
- Display active filters clearly. Empty states must distinguish no stored documents, no filter matches and a loading failure, and offer an appropriate next action.
- Autosave must expose pending/success/failure state. Retain edits on failure and provide retry or recovery. Keep temporary editing state separate where confirmation or cancellation is part of the workflow.
- Export must give visible progress and actionable failures. Distinguish generation, handoff to browser downloads and confirmed download completion; never claim a file was saved solely because generation succeeded.

## Data integrity, evidence and privacy

- Preserve captured facts and user intent. Do not invent steps, expected outcomes, successful results or Business Central values. Approval of a review step is not proof that the underlying business process succeeded.
- Keep raw recordings and original screenshots separate from derived documents. Regeneration, image replacement and language changes must preserve manual edits and annotations according to explicit product behavior, with safe preview/recovery for destructive replacements.
- Diagnose licensing and external integrations without exposing tokens, secrets, raw customer data or private registries. Keep authentication and authorization checks on the server.
- Usage statistics count unique documents/reports with idempotent delivery, bind identity to verified authentication and send only the documented metadata. Account changes and retries must not reassign ownership or duplicate counts.
- Do not introduce new external data transmission silently. Preserve existing consent boundaries and update the relevant disclosure when behavior changes. AI output remains derived assistance, never a replacement for captured evidence.

## Verification and completion

- Scale verification to the risk and affected behavior. Use existing tests where sufficient; add meaningful behavior/regression coverage for new logic, data migrations, asynchronous failure paths or uncovered defects. Do not add tests that merely mirror implementation text for a cosmetic change.
- Check the runtime in `.github/workflows/ci.yml` and package engine declarations. The extension CI currently uses Node 20; the licensing service declares Node 24 or later. Success on a newer local Node version does not prove compatibility with CI.
- For affected language behavior and user-facing text, follow the mandatory language checks below. For storage/default changes, test fresh installation, existing preferences and legacy records. For export changes, exercise the actual affected output and verify content, order, links/images and relevant layout.
- Run targeted checks while developing. Run `npm run build` and `npm run check` for extension runtime/UI changes. Run `npm run ci` for release preparation or changes spanning shared runtime paths. After a later fix, rerun affected checks; do not report a previous result as verification of code that changed afterward.
- Service and native checks are not all included in root CI. Inspect the relevant scripts/tests and run them separately when those components change. Ensure their dependencies are available before interpreting a test failure.
- Inspect every command's result. In a shell sequence, a final successful command does not erase an earlier failure. Do not weaken a failing test simply to make it pass; change an obsolete expectation only when the intended behavior changed and replacement coverage verifies that behavior.
- Documentation/rules-only changes require checking content, links and `git diff --check`, not unrelated application tests or builds. This does not exempt any accompanying user-facing product change from language verification.
- Update documentation and release notes when applicable. Report what changed, what was verified, relevant limitations and what remains. Do not claim complete language or visual coverage without evidence.
- Distinguish **implemented**, **tested**, **built**, **committed**, **pushed** and **deployed**. A local build or ZIP is not deployment, and a local CI pass is not a successful GitHub run.
- Commit, push and deploy according to the user's authorization and task scope. Do not infer production deployment from a request to implement a feature. Do not require a clean workspace or a commit to finish an otherwise complete local fix; report pending delivery steps accurately.

## Mandatory language support for every change

Every new feature, improvement, bug fix and other change must support **all registered application languages** before it is considered complete. This is a release requirement, not optional follow-up work.

- Use the language registry in `src/engine/language-registry.js` as the source of truth. Currently the supported languages are Swedish, English, French, German, Spanish, Danish, Finnish and Norwegian Bokmål. Any subsequently registered language is automatically covered by this rule.
- When adding a language to the registry, audit and bring the public Business Central knowledge catalog into balance across every registered language as part of the same change. Review every enabled knowledge pack and process area (sales, purchasing, cash management, warehouse, inventory, manufacturing, core/reference pages and any other applicable domain), including localized page captions, field/action aliases, concepts, source references and the language metadata on rules. Add official locale-specific documentation where available and runtime tests that resolve representative actions/fields in the new locale. Compare the coverage matrix for all locales so the new language does not ship with materially less supported process coverage than the existing languages. Where a Microsoft source or verified caption is unavailable, record the specific gap rather than inventing a translation; keep the gap visible in the catalog documentation and do not claim parity until it is addressed.
- Add or update translations for every affected user-facing string in every supported language. This includes labels, settings, help, placeholders, tooltips, accessible names, status messages, validation and error messages, confirmations, generated document text, report headings and export text.
- Use the shared localization mechanisms and catalogs. Do not introduce language-specific hardcoded UI text or Swedish-versus-English branches that exclude other languages. Falling back to English or Swedish does not count as completed language support for a new or changed system text.
- Keep interface language and document language independent. Preserve existing saved preferences and existing documents. New installations default to English for both language settings.
- Do not translate or alter user-authored text, captured Business Central labels, field values, raw error messages, diagnostics or technical identifiers merely because the language setting changes. Translate generated system templates while preserving their captured values and provenance.
- Verify the affected behavior in every supported language, including language selection, persistence, placeholders and interpolation, applicable plural forms, diacritics and special characters. Check layout and accessibility with longer translations; verify affected document and export paths in every supported document language.
- Run the relevant language and regression checks. At minimum, run `npm run test:language-registry`, `npm run test:ui-localization` and `npm run test:document-language` for changes affecting language behavior or user-facing text. Add meaningful coverage when a new path is not covered by existing checks. Run the normal build and required project checks as applicable.
- Before marking work complete, report what language coverage was verified and any remaining gaps. Missing translations, broken language-specific behavior or untranslated new system text must be fixed before the change is declared complete.

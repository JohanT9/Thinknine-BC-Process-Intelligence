# Knowledge feedback and learning — phase 5 foundation result

Added a local proposal generator over applied review history. It detects explicit task-classification corrections, groups them by redacted caption patterns, exposes source-rule provenance, and distinguishes one-off signals, repeated proposals and conflicting corrections. Undone commands are excluded. Suggestions require review, have heuristic rather than calibrated confidence, and cannot activate themselves.

The improvement service returns proposals separately from the existing aggregate-only downloadable dataset. A separate administration page exposes review-ready proposals, conflicting signals and saved inactive drafts in all registered UI languages. Administrators select a target knowledge pack; the service worker validates the candidate in a cloned copy of the active release using the repository importer, schema checks and existing conflict warnings. Validation is recalculated on read, and legacy drafts can be assigned a pack and revalidated. Administrators can download drafts in a versioned JSON package for offline review. The popup shortcut appears only after the licensing service verifies the signed-in account's `License.Administrator` app role. The background worker repeats the server-side role check and validates the extension-page origin before serving data or accepting draft changes. Draft export does not publish a rule; proposal patterns remain local, and no remote feedback or model training occurs.

The technical diagnostics link was removed from the popup and Document Library. Reading diagnostics, exporting improvement data and toggling capture diagnostics now require the separate managed `technicalDiagnosticsEnabled` policy and requests from `debug.html`. The normal recordings error now gives users a reload-and-retry action.

Knowledge proposal access is role-based: the existing Entra `License.Administrator`
role is checked by the license admin API on every proposal read and draft creation.
The new read-only role-check endpoint returns no user or proposal data; proposal and
review data remain on the device.

Translations for the admin and diagnostics policy messages were added in all eight registered UI locales. Lint, knowledge-pack validation, all eight locale lookups, JavaScript syntax checks, generated build and `git diff --check` passed. Regression tests were not run under the current test execution constraint.
